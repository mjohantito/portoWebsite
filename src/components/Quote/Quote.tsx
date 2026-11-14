import { useRef } from 'react'
import { useQuoteMotion } from './useQuoteMotion'
import './Quote.css'

const SENTENCES = [
  { text: 'I started a business to build something of my own.', accent: false },
  { text: 'It ended up building me.', accent: true },
]

const FULL_TEXT = SENTENCES.map((s) => s.text).join(' ')

export default function Quote() {
  const rootRef = useRef<HTMLElement>(null)
  useQuoteMotion(rootRef)

  return (
    <section
      ref={rootRef}
      className="quote"
      id="quote"
      aria-labelledby="quote-heading"
      data-snap="center"
    >
      <h2 className="visually-hidden" id="quote-heading">
        Quote
      </h2>
      <blockquote className="quote__block">
        <p className="quote__text" data-quote-text>
          {/* Screen readers get the sentence whole; the split words are decorative. */}
          <span className="visually-hidden">{FULL_TEXT}</span>
          <span aria-hidden="true">
            {SENTENCES.map((sentence) => (
              <span
                key={sentence.text}
                className={`quote__sentence${sentence.accent ? ' quote__sentence--accent' : ''}`}
              >
                {sentence.text.split(' ').map((word, i) => (
                  <span key={i}>
                    <span className="quote__word" data-quote-word>
                      {word}
                    </span>{' '}
                  </span>
                ))}
              </span>
            ))}
          </span>
        </p>
        <footer className="quote__footer">
          <cite>&mdash; Manuel Tito</cite>
        </footer>
      </blockquote>
    </section>
  )
}
