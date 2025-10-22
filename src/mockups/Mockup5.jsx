import React from 'react'

const Mockup5 = ({ view }) => {
  const styles = {
    container: {
      minHeight: '100vh',
      background: '#000',
    },
    header: {
      background: '#000',
      color: 'white',
      padding: '20px 28px',
      position: 'sticky',
      top: 0,
      zIndex: 10,
      borderBottom: '1px solid #222',
    },
    logo: {
      fontSize: '16px',
      fontWeight: '500',
      letterSpacing: '3px',
      textTransform: 'uppercase',
      color: '#fff',
    },
    main: {
      maxWidth: '1100px',
      margin: '0 auto',
      padding: '40px 28px',
    },
    feedItem: {
      marginBottom: '60px',
      position: 'relative',
    },
    eventImage: {
      width: '100%',
      height: '640px',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      marginBottom: '20px',
      position: 'relative',
    },
    overlay: {
      position: 'absolute',
      bottom: '0',
      left: '0',
      right: '0',
      background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 100%)',
      padding: '60px 32px 32px',
    },
    eventTitle: {
      fontSize: '38px',
      fontWeight: '600',
      marginBottom: '8px',
      color: '#fff',
    },
    eventMeta: {
      display: 'flex',
      alignItems: 'center',
      fontSize: '14px',
      color: '#aaa',
      gap: '16px',
    },
    avatar: {
      width: '32px',
      height: '32px',
      borderRadius: '50%',
      background: '#333',
      marginRight: '8px',
    },
    eventExcerpt: {
      fontSize: '15px',
      lineHeight: '1.7',
      color: '#ccc',
      marginTop: '16px',
      maxWidth: '600px',
    },
  }

  const detailStyles = {
    ...styles,
    main: {
      maxWidth: '100%',
      margin: '0',
      padding: '0',
    },
    heroImage: {
      width: '100%',
      height: '85vh',
      backgroundImage: 'url(https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=1600&q=80)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      position: 'relative',
      marginBottom: '60px',
    },
    heroOverlay: {
      position: 'absolute',
      bottom: '0',
      left: '0',
      right: '0',
      background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, transparent 100%)',
      padding: '120px 60px 60px',
    },
    eventTitle: {
      fontSize: '64px',
      fontWeight: '600',
      marginBottom: '16px',
      color: '#fff',
      maxWidth: '900px',
    },
    content: {
      maxWidth: '800px',
      margin: '0 auto',
      padding: '0 40px 80px',
    },
    text: {
      fontSize: '18px',
      lineHeight: '1.9',
      color: '#ccc',
      marginBottom: '40px',
    },
    imageBlock: {
      width: '100vw',
      marginLeft: 'calc(-50vw + 50%)',
      height: '70vh',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      marginBottom: '20px',
    },
    caption: {
      fontSize: '14px',
      color: '#888',
      fontStyle: 'italic',
      marginBottom: '60px',
      textAlign: 'center',
    },
  }

  if (view === 'feed') {
    return (
      <div style={styles.container}>
        <header style={styles.header}>
          <div style={styles.logo}>Our Family</div>
        </header>
        <main style={styles.main}>
          <article style={styles.feedItem}>
            <div style={{...styles.eventImage, backgroundImage: 'url(https://images.unsplash.com/photo-1516426122078-c23e76319801?w=1200&q=80)'}}>
              <div style={styles.overlay}>
                <h2 style={styles.eventTitle}>Africa Adventure 2025</h2>
                <div style={styles.eventMeta}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={styles.avatar}></div>
                    <span>Sarah Wilson</span>
                  </div>
                  <span>·</span>
                  <span>March 15 - 28, 2025</span>
                  <span>·</span>
                  <span>South Africa</span>
                </div>
                <p style={styles.eventExcerpt}>
                  Our journey through South Africa began at a stunning game lodge in Kruger.
                  The early morning drive revealed elephants, giraffes, and the most incredible sunrise...
                </p>
              </div>
            </div>
          </article>

          <article style={styles.feedItem}>
            <div style={{...styles.eventImage, backgroundImage: 'url(https://images.unsplash.com/photo-1464047736614-af63643285bf?w=1200&q=80)'}}>
              <div style={styles.overlay}>
                <h2 style={styles.eventTitle}>Kitchen Renovation Complete</h2>
                <div style={styles.eventMeta}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={styles.avatar}></div>
                    <span>Michael Chen</span>
                  </div>
                  <span>·</span>
                  <span>February 3 - March 1, 2025</span>
                  <span>·</span>
                  <span>Portland, OR</span>
                </div>
                <p style={styles.eventExcerpt}>
                  After months of planning and four weeks of construction, our kitchen transformation is finally done.
                  From demo day to the final touches, here's how we turned our dated 80s kitchen into a modern dream space...
                </p>
              </div>
            </div>
          </article>

          <article style={styles.feedItem}>
            <div style={{...styles.eventImage, backgroundImage: 'url(https://images.unsplash.com/photo-1519904981063-b0cf448d479e?w=1200&q=80)'}}>
              <div style={styles.overlay}>
                <h2 style={styles.eventTitle}>Emma & James Wedding</h2>
                <div style={styles.eventMeta}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={styles.avatar}></div>
                    <span>Emma Rodriguez</span>
                  </div>
                  <span>·</span>
                  <span>January 20, 2025</span>
                  <span>·</span>
                  <span>Napa Valley, CA</span>
                </div>
                <p style={styles.eventExcerpt}>
                  The most magical day of our lives. Surrounded by family and friends at a beautiful vineyard,
                  we said our vows as the sun set over the rolling hills. Every moment was perfect...
                </p>
              </div>
            </div>
          </article>
        </main>
      </div>
    )
  }

  return (
    <div style={detailStyles.container}>
      <header style={detailStyles.header}>
        <div style={detailStyles.logo}>Our Family</div>
      </header>
      <main style={detailStyles.main}>
        <div style={detailStyles.heroImage}>
          <div style={detailStyles.heroOverlay}>
            <h1 style={detailStyles.eventTitle}>Africa Adventure 2025</h1>
            <div style={detailStyles.eventMeta}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={detailStyles.avatar}></div>
                <span>Sarah Wilson</span>
              </div>
              <span>·</span>
              <span>March 15 - March 28, 2025</span>
              <span>·</span>
              <span>South Africa</span>
            </div>
          </div>
        </div>

        <div style={detailStyles.content}>
          <p style={detailStyles.text}>
            Our journey through South Africa began at a stunning game lodge in Kruger National Park.
            We arrived in the late afternoon, just in time to settle into our room before the evening drive.
            The anticipation was palpable as we prepared for our first safari experience.
          </p>

          <p style={detailStyles.text}>
            The first morning drive started at 5:30am. The air was crisp and cool, and within
            minutes we spotted a herd of elephants crossing the road ahead of us. Our guide stopped
            the vehicle and we sat in silence, watching these magnificent creatures go about their morning routine.
          </p>
        </div>

        <div style={{...detailStyles.imageBlock, backgroundImage: 'url(https://images.unsplash.com/photo-1564760055775-d63b17a55c44?w=1600&q=80)'}}></div>
        <div style={detailStyles.caption}>A family of elephants crossing our path in the golden morning light</div>

        <div style={detailStyles.content}>
          <p style={detailStyles.text}>
            After the drive, we returned to the lodge for an incredible breakfast spread.
            Fresh fruits, pastries, and traditional South African dishes were laid out on a terrace
            overlooking the waterhole. As we ate, we watched animals come to drink.
          </p>
        </div>

        <div style={{...detailStyles.imageBlock, backgroundImage: 'url(https://images.unsplash.com/photo-1525610553991-2bede1a236e2?w=1600&q=80)'}}></div>
        <div style={detailStyles.caption}>Morning breakfast overlooking the waterhole</div>

        <div style={detailStyles.content}>
          <p style={detailStyles.text}>
            The afternoon brought a different kind of magic. We ventured out to explore the surrounding area on foot,
            guided by a ranger who shared stories about the land and its inhabitants. The landscape stretched endlessly
            before us—golden grasses swaying in the breeze, acacia trees dotting the horizon.
          </p>
        </div>

        <div style={{...detailStyles.imageBlock, backgroundImage: 'url(https://images.unsplash.com/photo-1489392191049-fc10c97e64b6?w=1600&q=80)'}}></div>
        <div style={detailStyles.caption}>Walking safari through the African bush</div>

        <div style={detailStyles.content}>
          <p style={detailStyles.text}>
            As evening approached, we gathered around the fire pit with other guests. The sky transformed into
            a canvas of oranges and purples, and as darkness fell, the stars emerged in countless numbers.
            We'd never seen the Milky Way so clearly. Our guide pointed out constellations while sharing
            traditional stories passed down through generations.
          </p>

          <p style={detailStyles.text}>
            That night, lying in bed, we could hear the distant calls of hyenas and the rumbling of elephants.
            It was both thrilling and humbling to be so close to nature in its rawest form. This was only
            day one, and already we knew this trip would change us forever.
          </p>
        </div>

        <div style={{...detailStyles.imageBlock, backgroundImage: 'url(https://images.unsplash.com/photo-1523805009345-7448845a9e53?w=1600&q=80)'}}></div>
        <div style={detailStyles.caption}>Sunset over the African savannah</div>
      </main>
    </div>
  )
}

export default Mockup5