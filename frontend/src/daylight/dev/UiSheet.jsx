// The primitives sheet (owner: F0). ?only=ui. Every primitive at rest, on paper and on
// each wash, with its states. Capture: scripts/daylight/capture.mjs --only ui.
import { useState } from 'react'
import {
  Avatar, AvatarStack, Button, Card, cardLink, Chip, Dialog, EmptyState, Field, Head, Icon, IconButton, ICON_NAMES,
  Label, Menu, Readout, Segmented, Sheet, Skeleton, SkeletonText, Sticker, Stub, WASHES,
} from '../ui/index.js'
import { RouteSketch } from '../map/RouteSketch.jsx'
import { dateRange, readTime, shortPlace, timeLabel } from '../lib/format.js'
import s from './UiSheet.module.css'

const SAMPLE_JOURNEY = (() => {
  const pts = [
    ['Jackson Town Square', 43.4799, -110.7624, 0], ['Mormon Row', 43.6607, -110.665, 1], ['Schwabacher Landing', 43.7115, -110.6706, 1],
    ['Jenny Lake', 43.7515, -110.7223, 2], ['Hidden Falls', 43.7663, -110.7512, 2], ['Inspiration Point', 43.767, -110.7483, 2],
    ['Taggart Lake', 43.7041, -110.7546, 3], ['Oxbow Bend', 43.866, -110.5506, 4], ['Colter Bay', 43.9018, -110.644, 5],
  ]
  const stops = pts.map(([name, lat, lng, d], i) => ({ id: `s${i + 1}`, n: i + 1, name, lat, lng, dayIndex: d, kind: 'named', photoIds: [] }))
  const legs = stops.slice(1).map((b, i) => ({ id: `l${i}`, from: stops[i].id, to: b.id, seq: i + 1, dayIndex: b.dayIndex, arc: false }))
  return { stops, legs, days: [0, 1, 2, 3, 4, 5].map((index) => ({ index, label: `Day ${index + 1}` })) }
})()

function Row({ title, children, wash }) {
  return (
    <section className={s.row} data-wash={wash}>
      <h2 className={s.rowTitle}>{title}</h2>
      <div className={s.items}>{children}</div>
    </section>
  )
}

export default function UiSheet() {
  const [seg, setSeg] = useState('feed')
  const [chips, setChips] = useState({ following: true, vacations: false })
  const [sheet, setSheet] = useState(false)
  const [dialog, setDialog] = useState(false)
  return (
    <div className={`a-wrap ${s.sheet}`} data-ui="ui-sheet">
      <header className={s.top}>
        <Label>Daylight · primitives</Label>
        <Head as="h1" before="Every piece, on" mark="paper" after="." />
        <p className="a-mute">Phone first: every control has a 44px hit area and the same focus ring. Tab through this page to see it.</p>
      </header>

      <Row title="Buttons">
        <Button>New story</Button>
        <Button icon="plus">With an icon</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="quiet">Quiet</Button>
        <Button variant="danger" icon="trash">Move to trash</Button>
        <Button size="lg" iconAfter="arrow">Large</Button>
        <Button size="sm">Small</Button>
        <Button busy>Saving</Button>
        <Button disabled>Disabled</Button>
        <Button wash="fizz" icon="photos">On a wash</Button>
      </Row>

      <Row title="Icon buttons">
        <IconButton icon="search" label="Find people" />
        <IconButton icon="bell" label="Notifications" badge={3} />
        <IconButton icon="close" label="Close" variant="keyline" />
        <IconButton icon="more" label="More" variant="keyline" />
        <IconButton icon="plus" label="Zoom in" variant="float" />
        <IconButton icon="globe" label="Globe" variant="float" pressed />
        <IconButton icon="play" label="Play the journey" variant="solid" size="lg" />
      </Row>

      <Row title="Chips">
        <Chip onClick={() => setChips((c) => ({ ...c, following: !c.following }))} selected={chips.following}>Following</Chip>
        <Chip onClick={() => setChips((c) => ({ ...c, vacations: !c.vacations }))} selected={chips.vacations} dot wash="azure">Vacations</Chip>
        <Chip onRemove={() => {}} dot wash="fizz">Birthdays</Chip>
        <Chip icon="calendar">June 2026</Chip>
        <Chip size="sm" dot wash="lime">Day 3</Chip>
      </Row>

      <Row title="Segmented">
        <Segmented label="View" value={seg} onChange={setSeg} options={[{ value: 'feed', label: 'Feed', icon: 'feed' }, { value: 'calendar', label: 'Calendar', icon: 'calendar' }, { value: 'timeline', label: 'Timeline', icon: 'timeline' }]} />
        <Segmented size="sm" label="Order" value="happened" onChange={() => {}} options={[{ value: 'happened', label: 'Date it happened' }, { value: 'posted', label: 'Date posted' }]} />
      </Row>

      <Row title="People">
        <Avatar name="Maya Hartley" size={56} />
        <Avatar name="Tom Hartley" size={40} />
        <Avatar name="Ruth Hartley" size={32} />
        <Avatar name="Joe Bello" size={24} />
        <AvatarStack people={[{ name: 'Ruth Hartley' }, { name: 'Joe Bello' }, { name: 'Kate Brennan' }, { name: 'Marcus Bello' }, { name: 'Finn Brennan' }, { name: 'Priya Nair' }]} />
      </Row>

      <Row title="Type">
        <div className={s.stack}>
          <Head as="h3" size="page" before="Stories" />
          <Head as="h3" size="story" before="Seven days in the" mark="Tetons" />
          <Head as="h3" size="lead" before="A week on the Maine coast" />
          <Head as="h3" size="card" before="Kate and Marcus get married" />
          <p className="a-story">We came round the last bend and the whole range stood up out of the sage, pink at the top, and nobody said anything for a while. Even Leo.</p>
          <p className="a-label">August 2026 · 3 stories</p>
          <p className="a-mono a-small">
            {dateRange('2026-06-14T10:00:00', '2026-06-20T18:00:00')} · {dateRange('2026-06-28T10:00:00', '2026-07-03T18:00:00', { short: true })} · {timeLabel('2026-06-16T09:26:00')} · {shortPlace('Jenny Lake, Teton County, Wyoming, United States')} · {readTime('<p>' + 'word '.repeat(900) + '</p>')} min read
          </p>
          <p>Sticker: <Sticker>one</Sticker> word, at most, in a title or an empty state.</p>
        </div>
      </Row>

      <Row title="Cards">
        <Card interactive pad="none" className={s.demoCard}>
          <div className={s.demoCover} data-wash="azure" />
          <div className={s.demoText}>
            <span className="a-label a-mute">June 2026</span>
            <h3 className={s.demoTitle}><a href="#ui" className={cardLink}>Seven days in the Tetons</a></h3>
            <p className="a-mute a-small">Tom Hartley · Jun 14 – 20 · Jackson, Wyoming</p>
          </div>
        </Card>
        <Card className={`${s.demoCard} ${s.readouts}`}>
          <Readout label="Stories" value={12} />
          <Readout label="Followers" value={8} size="sm" />
        </Card>
        <Card tone="wash" wash="lime" className={s.demoCard}>
          <strong>On a wash, text is ink.</strong>
          <p className="a-small">White text on a wash fails contrast, so the rule is ink.</p>
        </Card>
      </Row>

      <Row title="Fields">
        <div className={s.fields}>
          <Field label="Title" hint="You can change it later.">
            <input defaultValue="Seven days in the Tetons" />
          </Field>
          <Field label="Who can open it">
            <select defaultValue="followers">
              <option value="private">Private</option>
              <option value="close_family">Close Family</option>
              <option value="followers">Followers</option>
              <option value="custom_group">Custom Group</option>
              <option value="public">Public</option>
            </select>
          </Field>
          <Field label="Anything the photos don't show?" optional error="That is a little long; keep it under 5,000 characters.">
            <textarea defaultValue="Biscuit stayed with Nana Ruth." />
          </Field>
        </div>
      </Row>

      <Row title="Overlays">
        <Button variant="ghost" onClick={() => setSheet(true)} data-open="sheet">Open a sheet</Button>
        <Button variant="ghost" onClick={() => setDialog(true)} data-open="dialog">Open a dialog</Button>
        <Menu
          label="Family"
          items={[{ label: 'Family tree', icon: 'family', href: '#ui' }, { label: 'Sharing and groups', icon: 'people', href: '#ui' }, { divider: true }, { label: 'Tags', icon: 'user', note: 'People without an account, and pets', href: '#ui' }]}
          trigger={(p) => <Button variant="ghost" {...p} iconAfter="chevron-down" data-open="menu">Open a menu</Button>}
        />
        <Sheet open={sheet} onClose={() => setSheet(false)} title="Filter" footer={<><Button variant="ghost" onClick={() => setSheet(false)}>Clear</Button><Button onClick={() => setSheet(false)}>Show 12 stories</Button></>}>
          <p className="a-mute">A bottom sheet on a phone, a centred card on desktop. Esc and the scrim close it; focus returns to the button.</p>
          <div className={s.items} style={{ marginTop: 16 }}>
            <Chip onClick={() => {}} selected>All</Chip>
            <Chip onClick={() => {}}>Following</Chip>
            <Chip onClick={() => {}}>Mine</Chip>
          </div>
        </Sheet>
        <Dialog open={dialog} onClose={() => setDialog(false)} title="Move this story to the trash?" actions={<><Button variant="ghost" onClick={() => setDialog(false)}>Keep it</Button><Button variant="danger" onClick={() => setDialog(false)}>Move to trash</Button></>}>
          <p>You can restore it from the trash on your profile.</p>
        </Dialog>
      </Row>

      <Row title="Loading and empty">
        <div className={s.demoCard}>
          <Skeleton h={140} r={16} />
          <div style={{ marginTop: 12 }}><SkeletonText lines={3} /></div>
        </div>
        <EmptyState wash="tide" icon="stories" before="No stories" mark="yet" after="." body="Stories from you and the people you follow show up here." action={<Button icon="photos">Make one from photos</Button>} className={s.demoEmpty} />
        <EmptyState tone="error" icon="warning" title="The stories did not load." body="Could not reach Our Family Socials. Check your connection." action={<Button>Retry</Button>} className={s.demoEmpty} />
      </Row>

      <Row title="Route sketch (the static map)">
        <div className={s.sketch}>
          <RouteSketch journey={SAMPLE_JOURNEY} activeStopId="s4" onStopSelect={() => {}} width={640} height={360} />
        </div>
      </Row>

      <Row title={`Icons (${ICON_NAMES.length})`}>
        <div className={s.icons}>
          {ICON_NAMES.map((n) => (
            <span key={n} className={s.icon} title={n}>
              <Icon name={n} size={22} />
              <span>{n}</span>
            </span>
          ))}
        </div>
      </Row>

      {WASHES.map((w) => (
        <Row key={w} title={`On ${w}`} wash={w}>
          <Button>Solid</Button>
          <Button variant="ghost">Ghost</Button>
          <Chip onClick={() => {}} selected>Selected</Chip>
          <Chip onClick={() => {}}>Chip</Chip>
          <IconButton icon="map" label="Map" variant="keyline" />
          <Label strong>Label · {w}</Label>
          <Sticker size="sm">{w}</Sticker>
        </Row>
      ))}

      <Row title="Stub">
        <Stub pkg="feed" name="A page another package owns" note="What a page shows before its package lands." />
      </Row>
    </div>
  )
}
