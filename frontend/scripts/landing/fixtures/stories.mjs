// The nine sample stories ("events" in the app). Bodies are stored the way the
// app's rich-text editor stores them: HTML with H1 sections and H2 sub-headings,
// paragraphs, block images (captions live on event_images), location markers and video.
import { img, has, VIDEO_RACE } from './media.mjs';
import { USERS } from './cast.mjs';

const P = (...lines) => lines.map((l) => `<p>${l}</p>`).join('');
const pic = (id, alt) => `<img src="${img(id)}" alt="${alt}">`;
const pin = (name, lat, lng, ts) =>
  `<span data-location-marker="" data-location-name="${name}" data-latitude="${lat}" data-longitude="${lng}" data-timestamp="${ts}" data-place-id="" class="location-marker" contenteditable="false">📍 ${name}</span>`;

// ---------------------------------------------------------------- coast stops
export const COAST_STOPS = [
  { name: 'St Ives harbour, Cornwall', lat: 50.2132, lng: -5.4786, ts: '2026-08-08T16:20:00Z', photo: 'photo-coast-harbour' },
  { name: 'Zennor Head, Cornwall', lat: 50.1975, lng: -5.5735, ts: '2026-08-09T13:05:00Z', photo: 'cover-coast' },
  { name: 'Pendeen lighthouse, Cornwall', lat: 50.1653, lng: -5.672, ts: '2026-08-10T19:40:00Z', photo: 'photo-coast-van' },
  { name: 'Botallack mine, Cornwall', lat: 50.1405, lng: -5.6869, ts: '2026-08-11T11:15:00Z', photo: 'photo-coast-mine' },
  { name: 'Sennen Cove, Cornwall', lat: 50.0767, lng: -5.7, ts: '2026-08-13T15:30:00Z', photo: 'photo-coast-beach' },
  { name: 'Porthcurno, Cornwall', lat: 50.042, lng: -5.651, ts: '2026-08-14T20:10:00Z', photo: 'photo-coast-theatre' },
];
const S = COAST_STOPS;

const COAST_BODY = [
  '<h1>The plan</h1>',
  P(
    'The plan, written on the back of an envelope in March, was simple: one week, one borrowed campervan, the far end of the coast path from St Ives round to Porthcurno. We would walk a stretch every day and catch the bus back to the van. Ivy would carry her own water. Leo would carry nothing and complain about it. Biscuit would be a credit to us all.',
    'Two of those things happened. I will let you guess which.',
  ),
  `<h1>St Ives to Zennor</h1>`,
  P(`We started where everyone starts, on the harbour wall at ${pin('St Ives harbour, Cornwall', S[0].lat, S[0].lng, S[0].ts)}, with an ice-cream each and a seagull watching Leo with real professional interest.`),
  '<h2>The ice-cream incident</h2>',
  P(
    'The seagull got the ice-cream. Leo got a second ice-cream. Tom got a lecture from a woman in a sun hat about feeding the gulls, which he took very graciously considering he had not fed anything to anybody.',
  ),
  pic('photo-coast-harbour', 'The family on the harbour wall at St Ives with ice-creams, fishing boats behind'),
  P(
    `The next morning we set off west. The path to Zennor is the hardest stretch of the week: up, down, over boulders, up again. Ivy counted the stiles (fourteen) and Leo rode on Tom's shoulders for most of the second half. Then you come round ${pin('Zennor Head, Cornwall', S[1].lat, S[1].lng, S[1].ts)} and the whole coast opens up in front of you, green and gold and impossibly blue, and nobody says anything for a while. Even Leo.`,
  ),
  '<h1>Pendeen and the van</h1>',
  P(
    `The van lived on a clifftop pitch near ${pin('Pendeen lighthouse, Cornwall', S[2].lat, S[2].lng, S[2].ts)}, cream and red and about forty years old. It had a fold-out table, a two-ring stove and a door that only opened if you said something kind to it first.`,
  ),
  pic('photo-coast-van', 'The cream and red campervan on a clifftop pitch with a washing line and camp chairs'),
  '<h2>Washing line diplomacy</h2>',
  P(
    'By day three the washing line was the most important thing we owned. Wet socks, wet towels, one wet dog blanket that never truly dried. Our neighbours had a line too, and there was a quiet competition about whose was tidier. They won. We had Biscuit, who took one of their tea towels and would not give it back.',
    'The lighthouse fog horn is retired, which Ivy found very disappointing. She did a demonstration instead. The neighbours did not complain, which I think means they had forgiven us for the tea towel.',
  ),
  '<h1>Botallack</h1>',
  P(
    `${pin('Botallack mine, Cornwall', S[3].lat, S[3].lng, S[3].ts)} was Ivy's day. The old engine houses sit right on the edge of the cliff, stone chimneys and broken arches, and the miners used to go down and out under the sea. She stood under the biggest one with her head tipped right back and asked about forty questions, and I knew the answer to about four of them.`,
  ),
  pic('photo-coast-mine', 'Ivy looking up at a ruined stone engine house on the clifftop'),
  P('She has since written a two-page report on tin mining for school, without being asked. I have never been prouder or more confused.'),
  '<h1>Sennen Cove</h1>',
  P(
    `We had a rest day at ${pin('Sennen Cove, Cornwall', S[4].lat, S[4].lng, S[4].ts)}, which in practice meant six hours on the biggest beach of the trip. The sand is white and goes on forever, and the water is the colour of the swimming pool at the leisure centre, only about twenty degrees colder.`,
  ),
  '<h2>Biscuit meets the Atlantic</h2>',
  P(
    'Biscuit has lived his whole life within two miles of a river and has never once gone in it. He looked at the sea for a long time. Then Leo ran in, and Biscuit decided that whatever was happening, he was not going to be left out of it.',
  ),
  pic('photo-coast-beach', 'Leo and Biscuit running at the edge of the sea on a wide sandy beach'),
  P('He came out, shook himself over my book, and went straight back in. We have a sea dog now. The car still smells of it.'),
  '<h1>Porthcurno</h1>',
  P(
    `The last night we walked over to ${pin('Porthcurno, Cornwall', S[5].lat, S[5].lng, S[5].ts)} to see a play at the open-air theatre cut into the cliff. Stone seats, the sea straight down below the stage, and the sun going down behind the actors. It was a comedy. I think. I spent most of it watching Ivy and Leo watching the sea.`,
  ),
  pic('photo-coast-theatre', 'The family on the stone seats of the open-air theatre above the sea'),
  '<h1>What we would do again</h1>',
  P(
    'All of it, apart from the seagull. Thirty-one miles on foot, one lost ice-cream, one converted dog, two very brown children and one van we were sad to give back. Tom has already found next year\'s envelope.',
  ),
].join('');

// ---------------------------------------------------------------- kitchen
const KITCHEN_BODY = [
  '<h1>Before</h1>',
  P(
    'Our kitchen was orange. Not a fun orange. A tired, eighties, pine-cupboard orange, with a drawer that came out in your hand and an oven door you had to hold shut with your hip. We said we would do something about it every January for six years.',
    'This January we did. Six weeks, the builder said. He was right, which nobody believed at the time.',
  ),
  pic('photo-kitchen-before', 'The old orange pine kitchen, empty'),
  P('I took this the night before the rip-out so we would remember. We will not be framing it.'),
  '<h1>The rip-out</h1>',
  P(
    'Tom insisted on doing the first cupboard himself. He bought goggles specially. He made a short speech. Then he swung the hammer and the cupboard door, which had been hanging on by one hinge since 2019, simply fell off before he hit it.',
    'He hit the cupboard anyway. You can see the dust.',
  ),
  pic('photo-kitchen-sledge', 'Tom in goggles mid-swing at a cabinet, dust in the air'),
  P('By the end of the first weekend the room was a shell: bare plaster, a pipe sticking out of the wall, and a square of lino under where the fridge had been that was still the original colour. It was yellow. Who knew.'),
  '<h1>Living on a camping stove</h1>',
  P(
    'For four weeks we cooked on a two-ring camping stove on the living-room floor. We ate a lot of pasta. We ate a lot of things that started as pasta and were then called something else.',
  ),
  '<h2>Pizza Fridays</h2>',
  P(
    'Fridays were takeaway pizza on a picnic blanket in front of the telly, and by week three the children were asking if we could keep doing it when the kitchen was finished. We said no. We have done it twice since.',
  ),
  pic('photo-kitchen-camping', 'The family eating pizza on the living-room floor around a camping stove and a kettle'),
  '<h2>The kettle</h2>',
  P('The kettle lived on the bookshelf. It is a measure of how tired we were that it took us until the end of week two to notice it had been sitting on the dictionary the whole time and had warped it into a small wooden bowl.'),
  '<h1>Tiles and paint</h1>',
  P(
    'I laid the floor tiles myself, which I would like noted. Patterned, blue and white, the ones I had been looking at for about four years. It took two full days and one evening where I sat on the floor and told the tiles exactly what I thought of them.',
  ),
  pic('photo-kitchen-tiling', 'Maya kneeling on the floor laying patterned tiles'),
  P(
    'The children were in charge of painting the cupboard doors. Sage green. Two coats, outside on the patio on the only dry weekend in February. Leo was very careful and very slow and somehow still got paint on his nose, his ear and the dog.',
  ),
  pic('photo-kitchen-paint', 'Ivy and Leo painting a cabinet door sage green, paint on Leo\'s nose'),
  '<h1>The first pancakes</h1>',
  P(
    'Six weeks to the day, the builder fitted the last handle, ran the tap for us like a magician, and left. We stood in the doorway for a bit, not quite sure we were allowed in.',
    'Then Ivy asked for pancakes, and that settled it. Tom made the first batch on the new hob. The first one stuck, as the first one always does. Nobody minded. We ate standing round the island because we had not bought the stools yet, and it was the best breakfast we have had in that house.',
    'The drawer still works. We check most days.',
  ),
].join('');

// ---------------------------------------------------------------- race
const RACE_BODY = [
  '<h1>The start</h1>',
  P(
    'A year ago I could not run for a bus. I know that because I tried, and the bus driver watched me in his mirror, and drove off. Sam from run club said I should sign up for the marathon, and I laughed, and then he made me do it on his phone in the pub before I could change my mind.',
    'Sixteen weeks of training later, we were standing in a pen at half past eight in the morning with nine thousand other people and a man dressed as a banana.',
  ),
  pic('photo-race-start', 'Tom and Sam among the runners at the start line'),
  '<h2>The plan</h2>',
  P('The plan was to go out slowly, stay with Sam until halfway, and then hold on. Deb, who has run more marathons than I have had hot dinners, said the plan was fine and that the plan always goes wrong at mile twenty, and that this is normal, and that I should eat a jelly baby when it does.'),
  '<h1>The wall</h1>',
  P(
    'At mile twenty, the plan went wrong. My legs just stopped being legs. They became two separate things that happened to be attached to me and had their own opinions. I grabbed a cup of water from a volunteer, poured most of it on my shirt, and walked for a bit.',
  ),
  pic('photo-race-mile20', 'Tom mid-race, looking pained, grabbing a cup of water'),
  P(
    'I ate a jelly baby. It did not help. I ate another one. It did not help either, but by then I had started running again, mostly out of embarrassment, because a woman who looked about eighty had just gone past me, and she was waving.',
  ),
  '<h1>The people who came</h1>',
  P(
    'Here is the part nobody tells you. The crowd does half the work. Every mile there are strangers shouting your name off your vest, and they mean it, and it is the most extraordinary thing.',
    'And then at mile twenty-two there were people who were not strangers.',
  ),
  '<h2>The star sign</h2>',
  P(
    'Ivy and Leo had made a sign the night before. It said nothing. Leo had argued for "GO DAD" and Ivy had argued for something longer, and in the end they had compromised on a very large drawn star, coloured in, which they held up together and shook. Mum was behind them with a flask. I cried. I am not ashamed of it.',
  ),
  pic('photo-race-kids', 'Ivy and Leo at the barrier holding a sign with a big drawn star, Nana Ruth behind them'),
  '<h1>The line</h1>',
  P('The last mile goes on for about a week. Then you turn the corner, and there it is, and you remember that you have arms and you put them up.'),
  P('Marcus filmed the last stretch from the barrier. You can hear Leo shouting the whole way.'),
  `<video src="${VIDEO_RACE}" controls="true"></video>`,
  P('Four hours, forty-one minutes and some seconds. I do not care about the seconds. Maya found me in the foil blanket bit, and held on, and said I smelled terrible, and did not let go.'),
  pic('photo-race-hug', 'Maya hugging Tom in his foil blanket'),
  '<h2>Chips</h2>',
  P('Afterwards we went to a cafe round the corner, all of us and Sam, medals on, and ordered every chip they had. Sam is already talking about next year. I have told him no. I have told him no about four times, which, as everyone in my family knows, means yes.'),
  pic('photo-race-chips', 'The family and Sam at a cafe table with chips, medals on'),
].join('');

// ---------------------------------------------------------------- Ivy nine
const IVY_BODY = [
  '<h1>The party</h1>',
  P(
    'Ivy is nine. She wanted a small party, "just family", and then sent us a list of who counted as family, which included her swimming teacher and the lady from the bakery. We negotiated.',
    'In the end it was the grandparents, Kate and Finn, Marcus, and a cake shaped like a swimming pool that I made at eleven o\'clock the night before. The water was blue icing. The swimmers were jelly babies. Tom ate the lifeguard.',
  ),
  '<h2>Nine candles</h2>',
  P('Grandpa Joe wore a paper crown for the entire afternoon and refused to take it off for the photos, or for the drive home. She blew out all nine candles in one go and then announced she would not be telling anyone the wish, "not even Biscuit".'),
  '<h1>The year she was eight</h1>',
  P('Looking back, eight was a big year. She built a rocket in the garden out of the boxes from the new kitchen, and took Leo to the moon in it most weekends.'),
  pic('photo-year-rocket', 'Ivy and Leo in the cardboard rocket in the garden'),
  P('And in June she won her first gala race, fifty metres backstroke, by about the length of a fingernail. She has the trophy on her windowsill, facing outward, so the street can see it.'),
  pic('photo-year-gala', 'Ivy on the poolside with a small trophy, a towel round her shoulders'),
  P('Happy birthday, Ivy. We love you to the moon and back, by rocket.'),
].join('');

// ---------------------------------------------------------------- Joe 70
const JOE_BODY = [
  '<h1>Seventy</h1>',
  P(
    'Joe said he did not want a fuss. Maya said he was getting a fuss. Maya won, as she does, and on the second Saturday of December we put two tables end to end in his garden, borrowed every chair on the street, and fed thirty people.',
    'It was cold enough to see your breath and nobody went inside.',
  ),
  '<h2>The speech</h2>',
  P('Marcus did a speech. It had slides. Some of the slides were photos of Joe in the seventies with a moustache we had all been told was a myth. Joe laughed until he had to sit down, and then he stood up and did a speech of his own, which was shorter, and better, and made Ruth cry.'),
  has('plate-year-d') ? pic('plate-year-d', 'The whole family round the long garden table at Grandpa Joe\'s seventieth') : '',
  '<h1>The dancing</h1>',
  P('Then he put a record on and danced with every single person there, oldest to youngest, finishing with Leo, who stood on his feet. Seventy years old and still the best dancer at his own party. Happy birthday, Dad.'),
].join('');

// ---------------------------------------------------------------- relatives
const JOE_TRIP_BODY = [
  '<h1>Funchal</h1>',
  P(
    'Three weeks in the sun to see off the winter. The hotel terrace looks straight down over the harbour, and every morning I have my coffee there and watch the boats come in, and every morning I think about how your grandmother would have loved it.',
    'Walked the old town. Ate too much fish. Learned four words of Portuguese and used them all on the waiter, who was very patient.',
  ),
  '<h2>The gardens</h2>',
  P('Took the cable car up the hill to the gardens and walked all the way down again, which my knees will tell you about. Flowers I have never seen in my life. Will bring seeds back for Ruth if they let me.'),
].join('');

const KATE_BODY = [
  '<h1>Up</h1>',
  P(
    'Finn said he would climb it if I promised not to talk the whole way up. I lasted about forty minutes. Five hours up the pony track, mostly in cloud, and then for the last half hour the cloud just lifted and there was the whole of Scotland laid out underneath us.',
  ),
  '<h2>The top</h2>',
  P('There was snow at the summit in June. Finn put a stone on the cairn and pretended he was not pleased. He was pleased. I have a photo that proves it.'),
  '<h1>Down</h1>',
  P('Coming down was worse. We ate every biscuit we had brought and then the emergency ones. Highly recommended. Next year he wants to do all three peaks. I have said we will see.'),
].join('');

const MARCUS_BODY = [
  '<h1>Ten days of eating</h1>',
  P(
    'I went to Osaka with a list of forty things to eat and came home having eaten fifty-two of them. The city is built for walking at night: canal-side streets lit up in every colour, and a stall on every corner selling something you have to try.',
  ),
  '<h2>Best thing</h2>',
  P('Octopus dumplings from a tiny stall by the river, eaten standing up, too hot, burnt my mouth, went back for more. Ivy, I have brought you a keyring shaped like one. Leo, yours is a dinosaur. I know my audience.'),
  '<h1>Things I photographed</h1>',
  P('About four thousand. You will be seeing roughly all of them at Christmas.'),
].join('');

const RUTH_BODY = [
  '<h1>The slow boat</h1>',
  P(
    'Took the ferry over to Mull for a week with my sister. Forty-five minutes across, and I stood on the deck for every one of them in my headscarf with a cup of tea, and saw two seals and something Margaret insists was an otter.',
    'The island is all colour: pink and yellow houses along the harbour, green hills, and the sea doing whatever it likes.',
  ),
  '<h2>Things we did</h2>',
  P('Walked a bit. Read a lot. Found a tea room that does a scone the size of Leo\'s head. Sent the children a postcard each, which will arrive after I do.'),
].join('');

// ---------------------------------------------------------------- assemble
const u = (k) => USERS[k];

export const STORIES = [
  {
    key: 'kitchen', id: 101, slug: 'six-weeks-without-a-kitchen', author: 'maya',
    title: 'Six weeks without a kitchen', short_title: 'Without a kitchen',
    summary: 'We took the kitchen back to bare walls in February and lived on a camping stove until the first pancakes.',
    start_date: '2026-02-01T09:00:00', end_date: '2026-03-14T09:00:00', created_at: '2026-03-15T18:20:00Z',
    location_name: 'Bristol, England', latitude: 51.4645, longitude: -2.5826,
    cover: ['cover-kitchen', 'photo-kitchen-done'], category: 'Project', category_2: null, privacy_level: 'followers',
    body: KITCHEN_BODY,
    images: [
      ['cover', 'Week six. The first pancakes, standing up, because we had not bought the stools yet.'],
      ['photo-kitchen-before', 'The night before. Goodbye, orange.'],
      ['photo-kitchen-sledge', 'Tom and the cupboard that fell off by itself.'],
      ['photo-kitchen-camping', 'Pizza Friday on the living-room floor, week three.'],
      ['photo-kitchen-tiling', 'Day two of tiling. Still speaking to the tiles, just.'],
      ['photo-kitchen-paint', 'Sage green, two coats, one nose.'],
    ],
  },
  {
    key: 'race', id: 102, slug: 'dads-first-marathon', author: 'tom',
    title: "Dad's first marathon", short_title: 'First marathon',
    summary: 'Sixteen weeks of training, one wall at mile twenty, and a sign with a star on it.',
    start_date: '2026-04-26T08:30:00', end_date: '2026-04-26T08:30:00', created_at: '2026-04-27T20:05:00Z',
    location_name: 'Greenwich, London', latitude: 51.4769, longitude: -0.0005,
    cover: ['cover-marathon', 'cover-race', 'photo-race-finish'], category: 'Milestone', category_2: null, privacy_level: 'custom_group', custom_group_id: 31,
    body: RACE_BODY,
    images: [
      ['cover', 'The line. I remembered I had arms.'],
      ['photo-race-start', 'Half past eight, the start pen, Sam pretending he is not nervous.'],
      ['photo-race-mile20', 'Mile twenty. The wall is real.'],
      ['photo-race-kids', 'Mile twenty-two. The star sign. Mum with the flask.'],
      ['video', 'The final straight, filmed by Marcus. Turn the sound up for Leo.'],
      ['photo-race-hug', 'Foil blanket, terrible smell, best hug.'],
      ['photo-race-chips', 'Every chip in the building.'],
    ],
  },
  {
    key: 'coast', id: 103, slug: 'a-week-on-the-coast-path', author: 'maya',
    title: 'A week on the coast path', short_title: 'The coast path',
    summary: 'St Ives to Porthcurno with a borrowed campervan, two children, one terrier and a seagull with ambitions.',
    start_date: '2026-08-08T10:00:00', end_date: '2026-08-15T10:00:00', created_at: '2026-08-17T19:30:00Z',
    location_name: 'St Ives, Cornwall', latitude: S[0].lat, longitude: S[0].lng,
    cover: ['cover-coast', 'photo-coast-cliff'], category: 'Vacation', category_2: null, privacy_level: 'followers',
    body: COAST_BODY,
    images: [
      ['cover', 'Zennor Head, day two. Nobody said anything for a while. Even Leo.'],
      ['photo-coast-harbour', 'St Ives harbour, ten minutes before the seagull struck.'],
      ['photo-coast-van', 'Home for the week, near Pendeen. The door needs to be spoken to nicely.'],
      ['photo-coast-mine', 'Botallack. Ivy had forty questions; I had four answers.'],
      ['photo-coast-beach', 'Sennen Cove. The moment Biscuit became a sea dog.'],
      ['photo-coast-theatre', 'The open-air theatre at Porthcurno, last night of the trip.'],
    ],
    stops: COAST_STOPS,
  },
  {
    key: 'year', id: 104, slug: 'ivy-turns-nine', author: 'maya',
    title: 'Ivy turns nine', short_title: 'Ivy turns nine',
    summary: 'A swimming-pool cake, nine candles and a wish she will not tell Biscuit.',
    start_date: '2026-10-17T14:00:00', end_date: '2026-10-17T14:00:00', created_at: '2026-10-18T09:10:00Z',
    location_name: 'Bristol, England', latitude: 51.4645, longitude: -2.5826,
    cover: ['cover-birthday', 'photo-year-birthday'], category: 'Birthday', category_2: null, privacy_level: 'close_family',
    body: IVY_BODY,
    images: [
      ['cover', 'Nine candles, one go. Grandpa Joe in the crown he would not take off.'],
      ['photo-year-rocket', 'Ground control to Leo.'],
      ['photo-year-gala', 'Fifty metres backstroke, won by a fingernail.'],
    ],
  },
  {
    key: 'joe70', id: 105, slug: 'grandpa-joe-at-seventy', author: 'tom',
    title: 'Grandpa Joe at seventy', short_title: 'Joe at seventy',
    summary: 'Two tables end to end, every chair on the street, and a seventy-year-old who out-danced us all.',
    start_date: '2026-12-12T13:00:00', end_date: '2026-12-12T13:00:00', created_at: '2026-12-13T21:00:00Z',
    location_name: 'Bath, Somerset', latitude: 51.3811, longitude: -2.359,
    cover: ['cover-joe70', 'photo-year-joe70'], category: 'Family Gathering', category_2: null, privacy_level: 'followers',
    body: JOE_BODY,
    images: [
      ['cover', 'Glasses up for Joe.'],
      ...(has('plate-year-d') ? [['plate-year-d', 'Everyone, and Biscuit, before the speeches.']] : []),
    ],
  },
  {
    key: 'trip-joe', id: 106, slug: 'three-weeks-in-funchal', author: 'joe',
    title: 'Three weeks in Funchal', short_title: 'Funchal',
    summary: 'Seeing off the winter on a terrace above the harbour.',
    start_date: '2026-03-02T10:00:00', end_date: '2026-03-23T10:00:00', created_at: '2026-03-24T12:00:00Z',
    location_name: 'Funchal, Madeira', latitude: 32.6496, longitude: -16.9086,
    cover: ['photo-trip-joe'], category: 'Vacation', category_2: null, privacy_level: 'followers',
    body: JOE_TRIP_BODY, images: [['cover', 'Coffee on the terrace, every morning.']],
  },
  {
    key: 'trip-kate', id: 107, slug: 'finn-and-i-climbed-ben-nevis', author: 'kate',
    title: 'Finn and I climbed Ben Nevis', short_title: 'Ben Nevis',
    summary: 'Five hours in the cloud, then the whole of Scotland.',
    start_date: '2026-06-20T07:00:00', end_date: '2026-06-20T07:00:00', created_at: '2026-06-21T19:45:00Z',
    location_name: 'Ben Nevis, Scotland', latitude: 56.7969, longitude: -5.0036,
    cover: ['photo-trip-kate'], category: 'Milestone', category_2: 'Vacation', privacy_level: 'followers',
    body: KATE_BODY, images: [['cover', 'The summit cairn. He is pleased, I promise.']],
  },
  {
    key: 'trip-marcus', id: 108, slug: 'ten-days-of-eating-in-osaka', author: 'marcus',
    title: 'Ten days of eating in Osaka', short_title: 'Osaka',
    summary: 'A list of forty things to eat and a camera roll of four thousand photos.',
    start_date: '2026-05-08T18:00:00', end_date: '2026-05-18T18:00:00', created_at: '2026-05-19T23:30:00Z',
    location_name: 'Osaka, Japan', latitude: 34.6687, longitude: 135.5013,
    cover: ['photo-trip-marcus'], category: 'Vacation', category_2: null, privacy_level: 'followers',
    body: MARCUS_BODY, images: [['cover', 'Dinner, standing up, by the canal.']],
  },
  {
    key: 'trip-ruth', id: 109, slug: 'the-slow-boat-to-mull', author: 'ruth',
    title: 'The slow boat to Mull', short_title: 'Mull',
    summary: 'A ferry, two seals and a scone the size of Leo\'s head.',
    start_date: '2026-09-07T11:00:00', end_date: '2026-09-14T11:00:00', created_at: '2026-09-15T16:00:00Z',
    location_name: 'Isle of Mull', latitude: 56.4416, longitude: -5.6797,
    cover: ['photo-trip-ruth'], category: 'Vacation', category_2: null, privacy_level: 'followers',
    body: RUTH_BODY, images: [['cover', 'Tea on deck. Margaret says the otter was real.']],
  },
];

export const byKey = Object.fromEntries(STORIES.map((s) => [s.key, s]));
export const authorOf = (s) => u(s.author);
