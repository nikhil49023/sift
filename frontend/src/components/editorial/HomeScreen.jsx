import React from "react";
import {
  ArrowUpRight,
  ArrowRight,
  FileText,
  Fingerprint,
  Users,
  Play,
  MoveDown,
  Sparkles,
} from "lucide-react";

function Wordmark() {
  return (
    <span className="wordmark">
      sift<span>.</span>
    </span>
  );
}

export { Wordmark };

export default function HomeScreen({ onStartShortlist, onOpenForensics }) {
  const scrollTo = (id) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  return (
    <div className="editorial home-screen">
      <header className="home-header">
        <a href="#home" className="brand-link" aria-label="SIFT home">
          <Wordmark />
          <span className="brand-caption">A considered shortlist.</span>
        </a>
        <nav aria-label="Main navigation" className="home-nav">
          <button onClick={() => scrollTo("the-method")}>Our approach</button>
          <button onClick={() => scrollTo("for-teams")}>For teams</button>
          <button onClick={onOpenForensics}>
            Live review <ArrowUpRight size={13} />
          </button>
        </nav>
        <button className="ed-button outline" onClick={onStartShortlist}>
          Open workspace <ArrowUpRight size={15} />
        </button>
      </header>

      <main>
        <section className="home-hero">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="status-dot" /> LESS GUESSWORK. MORE HUMAN.
            </p>
            <h1>
              The right people,
              <br />
              carefully <em>chosen.</em>
            </h1>
            <p className="hero-description">
              Behind every résumé is a story worth a closer look. Bring
              evidence, experience, and human judgment together — and find your
              next great person.
            </p>
            <div className="hero-actions">
              <button className="ed-button primary" onClick={onStartShortlist}>
                Start your shortlist <ArrowUpRight size={18} />
              </button>
              <button
                className="text-button"
                onClick={() => scrollTo("the-method")}
              >
                <span className="play-circle">
                  <Play size={11} fill="currentColor" />
                </span>{" "}
                Take a closer look
              </button>
            </div>
            <div className="hero-proof">
              <div className="avatar-stack">
                <img src="/assets/arjun_thumb.png" alt="" />
                <img src="/assets/meera_thumb.png" alt="" />
                <img src="/assets/karan_thumb.png" alt="" />
              </div>
              <p>
                Thoughtful tools.
                <br />
                <strong>For people who choose people.</strong>
              </p>
            </div>
          </div>

          <div className="hero-art" aria-label="Illustrative candidate dossier">
            <span className="art-orbit orbit-one" />
            <span className="art-orbit orbit-two" />
            <span className="art-annotation annotation-top">
              THERE’S MORE TO THE STORY.
              <MoveDown size={25} strokeWidth={1} />
            </span>
            <div className="dossier-back back-two">
              <span>03 / THE POSSIBILITIES</span>
            </div>
            <div className="dossier-back back-one">
              <span>02 / THE POTENTIAL</span>
            </div>
            <article className="hero-dossier">
              <div className="dossier-ribbon" />
              <div className="dossier-masthead">
                <span>CANDIDATE DOSSIER</span>
                <span>No. 001</span>
              </div>
              <div className="dossier-portrait-wrap">
                <img
                  className="dossier-portrait"
                  src="/assets/rhea_main.png"
                  alt="Illustrated profile portrait of Rhea Menon"
                />
                <span className="portrait-index">A PERSON, NOT A PROFILE.</span>
              </div>
              <div className="dossier-person">
                <div>
                  <p className="eyebrow">PRODUCT & STRATEGY</p>
                  <h2>Rhea Menon</h2>
                  <p>Bengaluru, India · 6 years of experience</p>
                </div>
                <span className="dossier-monogram">RM</span>
              </div>
              <div className="dossier-quote">
                <span>“</span>
                <p>
                  A builder with a bias
                  <br />
                  for better outcomes.
                </p>
              </div>
              <div className="dossier-bottom">
                <span>
                  <Fingerprint size={15} /> Beyond the résumé
                </span>
                <span>DEMO PROFILE</span>
              </div>
            </article>
            <div className="floating-note">
              <span className="note-pin" />
              <Sparkles size={17} />
              <span>
                Great work leaves a trail.
                <br />
                <strong>Follow the evidence.</strong>
              </span>
            </div>
            <span className="art-annotation annotation-bottom">
              The details make the difference.
            </span>
          </div>
        </section>

        <section className="principles-strip" aria-label="Our principles">
          <span className="strip-label">A BETTER WAY TO CHOOSE</span>
          <span>
            <FileText size={19} strokeWidth={1.3} /> Evidence over impressions
          </span>
          <span>
            <Fingerprint size={19} strokeWidth={1.3} /> People over profiles
          </span>
          <span>
            <Users size={19} strokeWidth={1.3} /> Judgment, together
          </span>
        </section>

        <section className="method-section" id="the-method">
          <div className="section-heading">
            <p className="eyebrow">01 / THE APPROACH</p>
            <h2>
              A little less noise.
              <br />
              <em>A lot more substance.</em>
            </h2>
            <p>
              Make room for what matters. A considered shortlist starts with a
              closer look.
            </p>
          </div>
          <div className="method-steps">
            {[
              [
                "01",
                "Look beyond the paper.",
                "Explore the experience, the thinking, and the work behind a candidate’s story.",
                FileText,
              ],
              [
                "02",
                "Connect the evidence.",
                "Bring the signals together. Ask better questions, compare thoughtfully, and keep your notes close.",
                Fingerprint,
              ],
              [
                "03",
                "Choose with intention.",
                "Build a shortlist you can explain. Keep human judgment at the heart of every decision.",
                Users,
              ],
            ].map(([number, title, description, Icon]) => (
              <article key={number}>
                <div className="method-step-top">
                  <span>{number}</span>
                  <Icon size={24} strokeWidth={1.2} />
                </div>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="teams-section" id="for-teams">
          <p className="eyebrow">MADE FOR THE PEOPLE IN THE ROOM.</p>
          <h2>
            Good decisions
            <br />
            are a <em>team sport.</em>
          </h2>
          <p>
            For recruiters building their next team. For juries finding the next
            big idea. For anyone who believes the details deserve attention.
          </p>
          <button className="ed-button primary" onClick={onStartShortlist}>
            Make room for your next great hire <ArrowRight size={17} />
          </button>
        </section>
      </main>
      <footer className="home-footer">
        <a href="#home" className="brand-link">
          <Wordmark />
        </a>
        <p>Considered decisions. Human possibilities.</p>
        <span>Made by The SIFT Core Team</span>
      </footer>
    </div>
  );
}
