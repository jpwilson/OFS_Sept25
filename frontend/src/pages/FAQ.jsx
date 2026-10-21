import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import styles from './FAQ.module.css'
import { faqCategories as faqs } from '../content/faqData.js'
import { pageByPath } from '../content/marketing.js'
import { useSeoHead } from '../content/useSeoHead.js'

const FAQ_PAGE = pageByPath('/faq')

export default function FAQ() {
  const { user } = useAuth()
  const [expandedItems, setExpandedItems] = useState({})

  // Title, description, canonical and the FAQPage graph all come from the one
  // head manager, so navigating away from /faq does not leave the FAQ
  // structured data attached to another page. See content/useSeoHead.js.
  useSeoHead(FAQ_PAGE)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  function toggleItem(categoryIndex, questionIndex) {
    const key = `${categoryIndex}-${questionIndex}`
    setExpandedItems(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  function isExpanded(categoryIndex, questionIndex) {
    return expandedItems[`${categoryIndex}-${questionIndex}`]
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <Link to={user ? `/profile/${user.username}` : '/'} className={styles.backLink}>
            ← Back
          </Link>
          <h1 className={styles.title}>Our Family Socials FAQ</h1>
          <p className={styles.subtitle}>
            Frequently asked questions about Our Family Socials, a private social network for
            families. If your question is not answered here, email support@ourfamilysocials.com.
          </p>
        </div>

        <div className={styles.faqList}>
          {faqs.map((category, categoryIndex) => (
            <div key={categoryIndex} className={styles.category}>
              <h2 className={styles.categoryTitle}>{category.category}</h2>
              <div className={styles.questions}>
                {category.questions.map((item, questionIndex) => (
                  <div key={questionIndex} className={styles.faqItem}>
                    <button
                      className={styles.question}
                      onClick={() => toggleItem(categoryIndex, questionIndex)}
                      aria-expanded={isExpanded(categoryIndex, questionIndex)}
                    >
                      <span>{item.q}</span>
                      <span className={styles.chevron}>
                        {isExpanded(categoryIndex, questionIndex) ? '−' : '+'}
                      </span>
                    </button>
                    {isExpanded(categoryIndex, questionIndex) && (
                      <div className={styles.answer}>
                        <p>{item.a}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className={styles.contactSection}>
          <h2>Still have questions?</h2>
          <p>We're here to help. Reach out and we'll get back to you as soon as possible.</p>
          <Link to="/contact" className={styles.contactButton}>Contact Us</Link>
        </div>
      </div>
    </div>
  )
}
