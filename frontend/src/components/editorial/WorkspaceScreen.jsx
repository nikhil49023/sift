import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  Users,
  Bookmark,
  BarChart3,
  Settings,
  Bell,
  ChevronLeft,
  ChevronRight,
  MapPin,
  GraduationCap,
  ArrowUpRight,
  ArrowLeft,
  ArrowRight,
  Plus,
  Check,
  X,
  Columns2,
  FileText,
  MessageSquare,
  SlidersHorizontal,
  Sparkles,
  ShieldCheck,
  Clock3,
  BriefcaseBusiness,
} from "lucide-react";
import { editorialCandidates } from "../../data/editorialCandidates";
import { Wordmark } from "./HomeScreen";
import CandidateCompareModal from "./CandidateCompareModal";
import EditorialDialog from "./EditorialDialog";
import { useWorkspaceStorage } from "./useWorkspaceStorage";

const idsAreValid = (value) =>
  Array.isArray(value) &&
  value.every((id) =>
    editorialCandidates.some((candidate) => candidate.id === id),
  ) &&
  new Set(value).size === value.length;
const notesAreValid = (value) =>
  value &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  Object.values(value).every((note) => typeof note === "string");
const roleIsValid = (value) =>
  value &&
  typeof value.title === "string" &&
  typeof value.location === "string";
const navItems = [
  { id: "discover", label: "Discover", Icon: Search },
  { id: "candidates", label: "Candidates", Icon: Users },
  { id: "shortlist", label: "My shortlist", Icon: Bookmark },
  { id: "insights", label: "Insights", Icon: BarChart3 },
];

export function SignalChart({ candidate }) {
  return (
    <div className="signal-chart" aria-label="Illustrative candidate signals">
      {candidate.signals.map((signal) => (
        <div className="signal-row" key={signal.name}>
          <span>{signal.name}</span>
          <div className="signal-track" aria-hidden="true">
            <span
              className="signal-fill"
              style={{ width: signal.candidate + "%" }}
            />
            <span
              className="signal-average"
              style={{ left: signal.average + "%" }}
            />
            <span
              className="signal-point"
              style={{ left: signal.candidate + "%" }}
            />
          </div>
          <strong>
            {signal.candidate}
            <span className="sr-only">
              {" "}
              out of 100; role average {signal.average}
            </span>
          </strong>
        </div>
      ))}
    </div>
  );
}

function MatchRing({ candidate }) {
  return (
    <div
      className="match-ring"
      aria-label={candidate.matchPercentage + "% illustrative match"}
    >
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle className="ring-track" cx="50" cy="50" r="44" />
        <circle
          className="ring-value"
          cx="50"
          cy="50"
          r="44"
          pathLength="100"
          strokeDasharray={candidate.matchPercentage + " 100"}
        />
      </svg>
      <div>
        <strong>
          {candidate.matchPercentage}
          <small>%</small>
        </strong>
        <span>sample match</span>
      </div>
    </div>
  );
}

function CandidateDossier({
  candidate,
  isShortlisted,
  onToggle,
  onCompare,
  canCompare,
  note,
  onNoteChange,
}) {
  const [tab, setTab] = useState("overview");
  const [expanded, setExpanded] = useState(false);
  const skills = candidate.skills.filter((skill) => !skill.startsWith("+"));
  const handleTabKey = (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const nextTab =
      event.key === "Home"
        ? "overview"
        : event.key === "End"
          ? "evidence"
          : tab === "overview"
            ? "evidence"
            : "overview";
    setTab(nextTab);
    document.getElementById(nextTab + "-tab-" + candidate.id)?.focus();
  };
  return (
    <article className="candidate-dossier">
      <div className="candidate-hero">
        <div className="candidate-photo">
          <img
            src={candidate.avatar}
            alt={"Illustrated portrait of " + candidate.name}
          />
          <span>THE PERSON BEHIND THE PROFILE.</span>
        </div>
        <div className="candidate-summary">
          <p className="eyebrow">{candidate.categoryRole}</p>
          <h2>{candidate.name}</h2>
          <p className="candidate-location">
            <MapPin size={13} />
            {candidate.location}
            <span>·</span>
            {candidate.experienceYears}
          </p>
          <span className="availability">
            <span className="status-dot" />
            {candidate.relocateStatus}
          </span>
          <p className="candidate-bio">{candidate.bio}</p>
          <div className="skill-tags">
            {(expanded ? skills : skills.slice(0, 4)).map((skill) => (
              <span key={skill}>{skill}</span>
            ))}
            {skills.length > 4 && (
              <button
                onClick={() => setExpanded(!expanded)}
                aria-expanded={expanded}
              >
                {expanded ? "Show less" : "+" + (skills.length - 4) + " more"}
              </button>
            )}
          </div>
        </div>
        <MatchRing candidate={candidate} />
      </div>
      <div
        className="dossier-tabs"
        onKeyDown={handleTabKey}
        role="tablist"
        aria-label="Dossier sections"
      >
        <button
          role="tab"
          id={"overview-tab-" + candidate.id}
          aria-controls={"dossier-panel-" + candidate.id}
          aria-selected={tab === "overview"}
          tabIndex={tab === "overview" ? 0 : -1}
          onClick={() => setTab("overview")}
        >
          Overview
        </button>
        <button
          role="tab"
          id={"evidence-tab-" + candidate.id}
          aria-controls={"dossier-panel-" + candidate.id}
          aria-selected={tab === "evidence"}
          tabIndex={tab === "evidence" ? 0 : -1}
          onClick={() => setTab("evidence")}
        >
          Evidence & notes <span>{note ? "1" : "0"}</span>
        </button>
        <span className="sample-label">ILLUSTRATIVE PROFILE</span>
      </div>
      <div
        role="tabpanel"
        id={"dossier-panel-" + candidate.id}
        aria-labelledby={
          (tab === "overview" ? "overview-tab-" : "evidence-tab-") +
          candidate.id
        }
        className="dossier-content"
      >
        {tab === "overview" ? (
          <div className="dossier-columns">
            <div>
              <div className="content-heading">
                <BriefcaseBusiness size={17} strokeWidth={1.4} />
                <h3>The experience</h3>
              </div>
              <ol className="experience-timeline">
                {candidate.experience.map((experience, index) => (
                  <li key={experience.company}>
                    <span
                      className={
                        "timeline-dot " + (index === 0 ? "current" : "")
                      }
                    />
                    <h4>{experience.title}</h4>
                    <p className="experience-meta">
                      {experience.company}
                      <span>·</span>
                      {experience.period}
                    </p>
                    <p>{experience.description}</p>
                  </li>
                ))}
              </ol>
              <div className="education-block">
                <GraduationCap size={20} strokeWidth={1.3} />
                <div>
                  <h4>{candidate.education.degree}</h4>
                  <p>{candidate.education.institution}</p>
                  <span>{candidate.education.period}</span>
                </div>
              </div>
            </div>
            <div>
              <div className="content-heading">
                <BarChart3 size={17} strokeWidth={1.4} />
                <h3>The signals</h3>
              </div>
              <div className="signal-legend">
                <span>
                  <i />
                  Candidate
                </span>
                <span>
                  <i />
                  Role average
                </span>
              </div>
              <SignalChart candidate={candidate} />
              <p className="signal-footnote">
                Illustrative scores for exploring this demo.
              </p>
              <div className="achievement-block">
                <p className="eyebrow">
                  <Sparkles size={13} /> MOMENTS THAT MATTER
                </p>
                {candidate.achievements.slice(0, 2).map((achievement) => (
                  <p key={achievement}>
                    <ArrowUpRight size={13} />
                    {achievement}
                  </p>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="evidence-content">
            <div className="content-heading">
              <FileText size={18} />
              <h3>The story, in context</h3>
            </div>
            <p className="muted-copy">
              These sample claims show how a dossier could read. Open Live
              review to inspect captured repository evidence.
            </p>
            <div className="evidence-excerpts">
              {[
                ["The work", candidate.evidenceHeadline],
                ["The experience", candidate.experienceHeadline],
                ["The perspective", candidate.fitHeadline],
              ].map(([title, text]) => (
                <article key={title}>
                  <span className="eyebrow">SAMPLE CLAIM</span>
                  <h4>{title}</h4>
                  <p>{text}</p>
                </article>
              ))}
            </div>
            <label className="notes-label" htmlFor={"note-" + candidate.id}>
              <MessageSquare size={17} /> Your private review notes
            </label>
            <textarea
              id={"note-" + candidate.id}
              value={note}
              onChange={(event) => onNoteChange(event.target.value)}
              maxLength={5000}
              placeholder="What stands out? What would you like to ask?"
              rows={5}
            />
            <p className="notes-hint">
              Saved on this browser. {note.length.toLocaleString()} / 5,000
              characters
            </p>
          </div>
        )}
      </div>
      <footer className="dossier-actions">
        <button className="text-button" onClick={() => setTab("evidence")}>
          <MessageSquare size={15} /> Add a note
        </button>
        <div>
          <button
            className="ed-button outline compact"
            onClick={onCompare}
            disabled={!canCompare}
          >
            <Columns2 size={15} /> Compare shortlist
          </button>
          <button
            className={
              "ed-button compact " +
              (isShortlisted ? "selected-button" : "primary")
            }
            onClick={onToggle}
            aria-pressed={isShortlisted}
          >
            {isShortlisted ? <Check size={15} /> : <Plus size={15} />}
            {isShortlisted ? "Shortlisted" : "Add to shortlist"}
          </button>
        </div>
      </footer>
    </article>
  );
}

function CandidateCollection({
  candidates,
  shortlistedIds,
  onSelect,
  onToggle,
  emptyTitle,
}) {
  if (!candidates.length)
    return (
      <div className="empty-state">
        <Search size={27} strokeWidth={1.2} />
        <h2>{emptyTitle}</h2>
        <p>Try another search or explore a few more profiles.</p>
      </div>
    );
  return (
    <div className="candidate-collection">
      {candidates.map((candidate) => (
        <article className="collection-card" key={candidate.id}>
          <button
            className="collection-profile"
            onClick={() => onSelect(candidate)}
          >
            <img src={candidate.thumb} alt="" />
            <span>
              <span className="eyebrow">{candidate.role}</span>
              <strong>{candidate.name}</strong>
              <span>{candidate.location}</span>
            </span>
            <ArrowUpRight size={20} />
          </button>
          <p>{candidate.bio}</p>
          <div className="collection-card-footer">
            <span>
              {candidate.matchPercentage}% <span>sample match</span>
            </span>
            <button
              className="text-button"
              onClick={() => onToggle(candidate)}
              aria-label={
                (shortlistedIds.includes(candidate.id)
                  ? "Remove "
                  : "Shortlist ") + candidate.name
              }
              aria-pressed={shortlistedIds.includes(candidate.id)}
            >
              <Bookmark
                size={15}
                fill={
                  shortlistedIds.includes(candidate.id)
                    ? "currentColor"
                    : "none"
                }
              />
              {shortlistedIds.includes(candidate.id)
                ? "Shortlisted"
                : "Shortlist"}
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

export default function WorkspaceScreen({ onBack, onOpenForensics }) {
  const [activeNav, setActiveNav] = useState("discover");
  const [selectedCandidate, setSelectedCandidate] = useState(
    editorialCandidates[0],
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [shortlistedIds, setShortlistedIds] = useWorkspaceStorage(
    "shortlist",
    ["cand-rhea", "cand-arjun"],
    idsAreValid,
  );
  const [notes, setNotes] = useWorkspaceStorage("notes", {}, notesAreValid);
  const [role, setRole] = useWorkspaceStorage(
    "role",
    { title: "Senior Product Manager", location: "Bengaluru · Hybrid" },
    roleIsValid,
  );
  const [roleDraft, setRoleDraft] = useState(role);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [activity, setActivity] = useState([]);
  const [toast, setToast] = useState("");
  const filtered = useMemo(
    () =>
      editorialCandidates.filter((candidate) =>
        [
          candidate.name,
          candidate.role,
          candidate.location,
          ...candidate.skills,
        ]
          .join(" ")
          .toLowerCase()
          .includes(searchQuery.trim().toLowerCase()),
      ),
    [searchQuery],
  );
  const shortlisted = editorialCandidates.filter((candidate) =>
    shortlistedIds.includes(candidate.id),
  );
  const currentIndex = editorialCandidates.findIndex(
    (candidate) => candidate.id === selectedCandidate.id,
  );
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(timer);
  }, [toast]);
  const notify = (message) => {
    setToast(message);
    setActivity((current) =>
      [
        {
          message,
          time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
        ...current,
      ].slice(0, 12),
    );
  };
  const toggleShortlist = (candidate) => {
    const saved = shortlistedIds.includes(candidate.id);
    setShortlistedIds((current) =>
      saved
        ? current.filter((id) => id !== candidate.id)
        : [...current, candidate.id],
    );
    notify(
      candidate.name +
        (saved ? " removed from your shortlist." : " added to your shortlist."),
    );
  };
  const selectCandidate = (candidate) => {
    setSelectedCandidate(candidate);
    setActiveNav("discover");
    setSearchQuery("");
  };
  const changeNav = (nav) => {
    setActiveNav(nav);
    setSearchQuery("");
    if (nav === "settings") setRoleDraft(role);
  };
  const visibleCandidates =
    activeNav === "shortlist"
      ? filtered.filter((candidate) => shortlistedIds.includes(candidate.id))
      : filtered;
  const showCollection =
    searchQuery.trim() || ["candidates", "shortlist"].includes(activeNav);
  const heading = searchQuery.trim()
    ? "Find your next possibility."
    : {
        discover: "A closer look.",
        candidates: "People, with potential.",
        shortlist: "Your considered shortlist.",
        insights: "See the bigger picture.",
        settings: "Make it your workspace.",
      }[activeNav];

  return (
    <div className="editorial workspace-screen">
      <header className="workspace-header">
        <button
          className="brand-link"
          onClick={onBack}
          aria-label="Back to SIFT home"
        >
          <Wordmark />
          <span className="workspace-brand-caption">
            THE SHORTLIST WORKSPACE
          </span>
        </button>
        <div className="workspace-header-actions">
          <label className="workspace-search">
            <Search size={16} />
            <input
              type="search"
              aria-label="Search candidates, skills or roles"
              placeholder="A name, a skill, a possibility…"
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                if (["settings", "insights"].includes(activeNav))
                  setActiveNav("candidates");
              }}
            />
            <span className="search-hint">SEARCH</span>
          </label>
          <button className="text-button live-link" onClick={onOpenForensics}>
            Live review <ArrowUpRight size={15} />
          </button>
          <button
            className="icon-button activity-button"
            aria-label="View workspace activity"
            onClick={() => setIsActivityOpen(true)}
          >
            <Bell size={18} />
            {activity.length > 0 && <i />}
          </button>
          <button
            className="team-avatar"
            aria-label="Workspace settings"
            onClick={() => changeNav("settings")}
          >
            ST
          </button>
        </div>
      </header>
      <div className="workspace-layout">
        <aside className="workspace-nav">
          <div>
            <p className="eyebrow nav-caption">YOUR WORKSPACE</p>
            <nav aria-label="Workspace navigation">
              {navItems.map(({ id, label, Icon }) => (
                <button
                  className={"nav-item " + (activeNav === id ? "active" : "")}
                  aria-current={activeNav === id ? "page" : undefined}
                  key={id}
                  onClick={() => changeNav(id)}
                >
                  <Icon size={17} strokeWidth={1.6} />
                  <span>{label}</span>
                  {id === "candidates" && <small>04</small>}
                  {id === "shortlist" && (
                    <small>{String(shortlisted.length).padStart(2, "0")}</small>
                  )}
                </button>
              ))}
            </nav>
            <div className="nav-separator" />
            <button
              className={
                "nav-item " + (activeNav === "settings" ? "active" : "")
              }
              onClick={() => changeNav("settings")}
            >
              <Settings size={17} strokeWidth={1.6} />
              <span>Settings</span>
            </button>
          </div>
          <div className="nav-bottom">
            <div className="role-card">
              <span className="eyebrow">YOUR SEARCH</span>
              <h3>{role.title}</h3>
              <p>{role.location}</p>
              <button
                className="text-button"
                onClick={() => changeNav("settings")}
              >
                Edit your brief <ArrowUpRight size={13} />
              </button>
            </div>
            <span className="demo-label">
              <span className="status-dot" /> DEMO WORKSPACE
            </span>
            <p className="nav-team">
              Made by
              <br />
              <strong>The SIFT Core Team</strong>
            </p>
          </div>
        </aside>
        <main className="workspace-main">
          <div className="workspace-page-heading">
            <p className="eyebrow">
              {activeNav === "settings"
                ? "A FEW PERSONAL TOUCHES"
                : "GOOD PEOPLE. GREAT POSSIBILITIES."}
            </p>
            <h1>{heading}</h1>
            <p>
              {activeNav === "insights"
                ? "A thoughtful view of the people you’re considering."
                : activeNav === "settings"
                  ? "Set the context for your next considered decision."
                  : "Look past the résumé. There’s a person worth discovering."}
            </p>
          </div>
          <div className="workspace-context">
            <span>
              <BriefcaseBusiness size={14} />
              {role.title}
            </span>
            <span>
              {String(editorialCandidates.length).padStart(2, "0")} demo
              profiles <span className="context-dot">·</span> For exploration
            </span>
          </div>
          {activeNav === "settings" ? (
            <form
              className="workspace-settings"
              onSubmit={(event) => {
                event.preventDefault();
                setRole({
                  title: roleDraft.title.trim(),
                  location: roleDraft.location.trim(),
                });
                notify("Your search brief has been saved.");
              }}
            >
              <div className="content-heading">
                <SlidersHorizontal size={18} />
                <h2>Your search brief</h2>
              </div>
              <p>
                This brief adds context to your workspace. Demo match scores
                stay illustrative.
              </p>
              <label>
                Role title
                <input
                  required
                  maxLength={100}
                  value={roleDraft.title}
                  onChange={(event) =>
                    setRoleDraft({ ...roleDraft, title: event.target.value })
                  }
                />
              </label>
              <label>
                Location & working style
                <input
                  required
                  maxLength={100}
                  value={roleDraft.location}
                  onChange={(event) =>
                    setRoleDraft({ ...roleDraft, location: event.target.value })
                  }
                />
              </label>
              <button
                className="ed-button primary"
                disabled={!roleDraft.title.trim() || !roleDraft.location.trim()}
              >
                Save brief <Check size={16} />
              </button>
              <div className="settings-info">
                <ShieldCheck size={18} />
                <p>
                  Your shortlist and notes are saved in this browser. Open Live
                  review for your authenticated SIFT organization and real
                  evidence.
                </p>
              </div>
            </form>
          ) : activeNav === "insights" ? (
            <section className="workspace-insights">
              <div className="insight-stats">
                <article>
                  <span className="eyebrow">PROFILES EXPLORED</span>
                  <strong>04</strong>
                  <span>Four different perspectives</span>
                </article>
                <article>
                  <span className="eyebrow">YOUR SHORTLIST</span>
                  <strong>{String(shortlisted.length).padStart(2, "0")}</strong>
                  <span>People worth a closer look</span>
                </article>
                <article>
                  <span className="eyebrow">REVIEW NOTES</span>
                  <strong>
                    {String(
                      Object.values(notes).filter((note) => note.trim()).length,
                    ).padStart(2, "0")}
                  </strong>
                  <span>Stories you’ve added context to</span>
                </article>
              </div>
              <div className="insight-signals">
                <div className="content-heading">
                  <BarChart3 size={18} />
                  <h2>Different people. Different strengths.</h2>
                </div>
                <p>
                  Sample signals help illustrate a comparison. They do not
                  represent verified assessments.
                </p>
                <div className="insight-candidates">
                  {editorialCandidates.map((candidate) => (
                    <article key={candidate.id}>
                      <button onClick={() => selectCandidate(candidate)}>
                        <img src={candidate.thumb} alt="" />
                        <h3>{candidate.name}</h3>
                        <ArrowUpRight size={16} />
                      </button>
                      <SignalChart candidate={candidate} />
                    </article>
                  ))}
                </div>
              </div>
            </section>
          ) : showCollection ? (
            <>
              <div className="collection-heading">
                <span>
                  {visibleCandidates.length}{" "}
                  {visibleCandidates.length === 1 ? "person" : "people"}
                  {searchQuery.trim()
                    ? " matching “" + searchQuery.trim() + "”"
                    : " to consider"}
                </span>
                {searchQuery && (
                  <button
                    className="text-button"
                    onClick={() => setSearchQuery("")}
                  >
                    Clear search <X size={13} />
                  </button>
                )}
              </div>
              <CandidateCollection
                candidates={visibleCandidates}
                shortlistedIds={shortlistedIds}
                onSelect={selectCandidate}
                onToggle={toggleShortlist}
                emptyTitle={
                  activeNav === "shortlist" && !searchQuery
                    ? "Your next great hire starts here."
                    : "No profiles found, yet."
                }
              />
            </>
          ) : (
            <>
              <div className="dossier-breadcrumb">
                <button
                  className="text-button"
                  onClick={() => changeNav("candidates")}
                >
                  <ArrowLeft size={13} /> All candidates
                </button>
                <div>
                  <span>
                    {String(currentIndex + 1).padStart(2, "0")}{" "}
                    <span>/ 04</span>
                  </span>
                  <button
                    className="icon-button"
                    aria-label="Previous candidate"
                    onClick={() =>
                      setSelectedCandidate(
                        editorialCandidates[
                          (currentIndex + editorialCandidates.length - 1) %
                            editorialCandidates.length
                        ],
                      )
                    }
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label="Next candidate"
                    onClick={() =>
                      setSelectedCandidate(
                        editorialCandidates[
                          (currentIndex + 1) % editorialCandidates.length
                        ],
                      )
                    }
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
              <CandidateDossier
                key={selectedCandidate.id}
                candidate={selectedCandidate}
                isShortlisted={shortlistedIds.includes(selectedCandidate.id)}
                onToggle={() => toggleShortlist(selectedCandidate)}
                canCompare={shortlisted.length >= 2}
                onCompare={() => setIsCompareOpen(true)}
                note={notes[selectedCandidate.id] || ""}
                onNoteChange={(note) =>
                  setNotes((current) => ({
                    ...current,
                    [selectedCandidate.id]: note,
                  }))
                }
              />
            </>
          )}
          <p className="workspace-bottom-note">
            A considered shortlist. An entirely human decision.
          </p>
        </main>
        <aside className="shortlist-panel" aria-label="Your shortlist">
          <div className="shortlist-panel-heading">
            <div>
              <p className="eyebrow">WORTH A CLOSER LOOK</p>
              <h2>
                Your shortlist <span>({shortlisted.length})</span>
              </h2>
            </div>
            <button
              className="icon-button"
              aria-label="View all shortlisted candidates"
              onClick={() => changeNav("shortlist")}
            >
              <ArrowUpRight size={19} />
            </button>
          </div>
          <div className="shortlist-cards">
            {shortlisted.map((candidate, index) => (
              <article
                className={
                  "shortlist-card " +
                  (selectedCandidate.id === candidate.id ? "selected" : "")
                }
                key={candidate.id}
              >
                <button
                  className="shortlist-card-main"
                  onClick={() => selectCandidate(candidate)}
                >
                  <img src={candidate.thumb} alt="" />
                  <div>
                    <span className="eyebrow">0{index + 1} / SHORTLISTED</span>
                    <h3>{candidate.name}</h3>
                    <p>{candidate.role}</p>
                    <span className="shortlist-match">
                      {candidate.matchPercentage}% <span>sample match</span>
                    </span>
                    <div className="mini-progress">
                      <span
                        style={{ width: candidate.matchPercentage + "%" }}
                      />
                    </div>
                  </div>
                </button>
                <button
                  className="shortlist-remove"
                  aria-label={"Remove " + candidate.name + " from shortlist"}
                  onClick={() => toggleShortlist(candidate)}
                >
                  <X size={12} />
                </button>
              </article>
            ))}
          </div>
          {!shortlisted.length && (
            <div className="shortlist-empty">
              <Bookmark size={24} strokeWidth={1.2} />
              <p>
                A little room
                <br />
                for great possibilities.
              </p>
              <span>Add someone from the candidate dossiers.</span>
            </div>
          )}
          <div className="compare-callout">
            <Columns2 size={22} strokeWidth={1.2} />
            <h3>Good, side by side.</h3>
            <p>
              A closer look at the experience, skills, and signals that make
              each person different.
            </p>
            <button
              className="ed-button outline"
              disabled={shortlisted.length < 2}
              onClick={() => setIsCompareOpen(true)}
            >
              Compare shortlist <ArrowRight size={14} />
            </button>
            {shortlisted.length < 2 && (
              <span className="compare-hint">
                Shortlist at least two people to compare.
              </span>
            )}
          </div>
          <div className="shortlist-quote">
            <span>“</span>
            <p>
              The best person for the role
              <br />
              is more than a line on paper.
            </p>
            <div className="quote-line" />
          </div>
          <p className="shortlist-demo-note">
            Sample profiles & illustrative scores.
            <br />
            Your judgment makes the difference.
          </p>
        </aside>
      </div>
      <CandidateCompareModal
        candidates={shortlisted}
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
        onSelectCandidate={selectCandidate}
      />
      <EditorialDialog
        isOpen={isActivityOpen}
        onClose={() => setIsActivityOpen(false)}
        title="Your workspace, in motion."
        description="Recent activity from this visit."
      >
        <div className="activity-list">
          {activity.length ? (
            activity.map((item, index) => (
              <div key={index}>
                <Clock3 size={16} />
                <p>{item.message}</p>
                <span>{item.time}</span>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <Bell size={24} />
              <h3>A quiet beginning.</h3>
              <p>Your shortlist updates will appear here.</p>
            </div>
          )}
        </div>
      </EditorialDialog>
      {toast && (
        <div className="workspace-toast" role="status">
          <Check size={16} />
          <span>{toast}</span>
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
