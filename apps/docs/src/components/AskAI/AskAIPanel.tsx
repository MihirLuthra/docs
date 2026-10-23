import {useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode} from 'react';
import Link from '@docusaurus/Link';
import {KindIcon} from '../KindIcon';
import {related} from '../Search/rank';
import {useIndex} from '../Search/useIndex';
import {SparkleIcon} from './SparkleIcon';
import styles from './styles.module.css';

// Example questions for the empty state (from the N5 prototype).
const EXAMPLES = [
  'How does CCM verify a TDX workload?',
  'Which DSM client should I use from Java?',
  'What do I need to run Confidential AI on GPUs?',
];

function CloseIcon(): ReactNode {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2.5" />
    </svg>
  );
}

function SendIcon(): ReactNode {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.5" />
    </svg>
  );
}

function Exchange({question}: {question: string}): ReactNode {
  const index = useIndex();
  const pages = useMemo(() => (index ? related(index, question) : []), [index, question]);
  return (
    <div className={styles.exchange}>
      <p className={styles.question}>{question}</p>
      <div className={styles.answer} role="status">
        <p className={styles.notConnected}>Ask AI isn't connected yet.</p>
        <p className={styles.sourcesLabel}>Related pages</p>
        {index && pages.length === 0 && <p className={styles.muted}>No matching pages.</p>}
        <ul className={styles.sources}>
          {pages.map((page) => (
            <li key={page.href + page.title}>
              <Link to={page.href} className={styles.source}>
                <KindIcon kind={page.kind} size="sm" />
                <span className={styles.sourceText}>
                  <strong>{page.title}</strong>
                  {page.path.length > 0 && <span className={styles.muted}> · {page.path.join(' / ')}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/**
 * Ask AI side panel (ux-spec.md). UI only: there is no backend yet (D12), so
 * it says so and lists related pages from the search index. It never shows
 * an answer it didn't get.
 */
export default function AskAIPanel({
  initialQuestion,
  onClose,
}: {
  initialQuestion?: string;
  onClose: () => void;
}): ReactNode {
  const [questions, setQuestions] = useState<string[]>(initialQuestion ? [initialQuestion] : []);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  useEffect(() => {
    if (initialQuestion) setQuestions((q) => (q[q.length - 1] === initialQuestion ? q : [...q, initialQuestion]));
  }, [initialQuestion]);
  useEffect(() => {
    endRef.current?.scrollIntoView({block: 'end'});
  }, [questions]);

  const ask = (question: string) => {
    const q = question.trim();
    if (!q) return;
    setQuestions((prev) => [...prev, q]);
    setDraft('');
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    ask(draft);
  };

  return (
    <aside
      className={styles.panel}
      aria-label="Ask AI"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}>
      <div className={styles.head}>
        <span className={styles.headIcon}>
          <SparkleIcon />
        </span>
        <span className={styles.headText}>
          <span className={styles.headTitle}>Ask AI</span>
          <span className={styles.headLine}>Answers come from these docs, with sources</span>
        </span>
        <button type="button" className={styles.iconButton} onClick={onClose} aria-label="Close Ask AI">
          <CloseIcon />
        </button>
      </div>

      <div className={styles.body}>
        {questions.length === 0 ? (
          <>
            <p className={styles.intro}>Ask anything about Fortanix. Try:</p>
            {EXAMPLES.map((example) => (
              <button key={example} type="button" className={styles.example} onClick={() => ask(example)}>
                {example}
              </button>
            ))}
          </>
        ) : (
          questions.map((q, i) => <Exchange key={i} question={q} />)
        )}
        <div ref={endRef} />
      </div>

      <form className={styles.foot} onSubmit={onSubmit}>
        <div className={styles.inputBox}>
          <input
            ref={inputRef}
            className={styles.input}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask a question"
            aria-label="Ask a question"
          />
          <button type="submit" className={styles.send} aria-label="Send">
            <SendIcon />
          </button>
        </div>
        <p className={styles.note}>AI answers can be wrong; check the sources.</p>
      </form>
    </aside>
  );
}
