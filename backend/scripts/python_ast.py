"""Parse supplied text as data; never import or execute submitted modules."""
import ast
import json
import sys

try:
    tree = ast.parse(json.load(sys.stdin)["content"])
    functions = []
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            body = list(node.body)
            if body and isinstance(body[0], ast.Expr) and isinstance(body[0].value, ast.Constant) and isinstance(body[0].value.value, str):
                body = body[1:]
            empty = not body or all(isinstance(n, ast.Pass) for n in body)
            placeholder = any(isinstance(n, ast.Raise) and "NotImplemented" in ast.unparse(n) for n in body)
            branches = sum(isinstance(n, (ast.If, ast.For, ast.While, ast.Try, ast.IfExp, ast.BoolOp)) for n in ast.walk(node))
            functions.append({"name": node.name, "line": node.lineno, "endLine": node.end_lineno, "empty": empty, "placeholder": placeholder, "complexity": 1 + branches})
    print(json.dumps({"functions": functions, "error": None}))
except (SyntaxError, ValueError, KeyError, RecursionError) as error:
    print(json.dumps({"functions": [], "error": type(error).__name__}))
