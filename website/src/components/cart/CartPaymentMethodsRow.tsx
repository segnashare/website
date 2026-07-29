import styles from './cartPage.module.css'

/** Badges moyens de paiement acceptés (indicatif) sous le CTA panier. */
export function CartPaymentMethodsRow() {
  return (
    <ul className={styles.payMethods} aria-label="Moyens de paiement acceptés">
      <li className={`${styles.payMethod} ${styles.payMethodApple}`}>
        <span className={styles.payMethodSr}>Apple Pay</span>
        {/* Asset noir → inversé en blanc sur fond noir */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/payment/apple-pay.png"
          alt=""
          className={`${styles.payMethodImg} ${styles.payMethodImgInvert}`}
          width={112}
          height={46}
          decoding="async"
        />
      </li>

      <li className={`${styles.payMethod} ${styles.payMethodLight}`}>
        <span className={styles.payMethodSr}>Stripe</span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/payment/stripe.png"
          alt=""
          className={styles.payMethodImg}
          width={112}
          height={47}
          decoding="async"
        />
      </li>

      <li className={`${styles.payMethod} ${styles.payMethodLight}`}>
        <span className={styles.payMethodSr}>Visa</span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/payment/visa.png"
          alt=""
          className={styles.payMethodImg}
          width={112}
          height={36}
          decoding="async"
        />
      </li>

      <li className={`${styles.payMethod} ${styles.payMethodKlarna}`}>
        <span className={styles.payMethodSr}>Klarna</span>
        <svg className={styles.payMethodSvg} viewBox="0 0 100 24" aria-hidden>
          <text
            x="50"
            y="17"
            textAnchor="middle"
            fill="#0A0A0A"
            fontFamily="Georgia, 'Times New Roman', serif"
            fontSize="15"
            fontWeight="700"
            letterSpacing="-0.3"
          >
            Klarna.
          </text>
        </svg>
      </li>
    </ul>
  )
}
