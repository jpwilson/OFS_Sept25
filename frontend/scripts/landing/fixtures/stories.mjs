// The sample stories ("events" in the app), round two: an American family in Madison, Wisconsin.
// Bodies are stored the way the app's rich-text editor stores them: HTML with H1 sections and
// H2 sub-headings, paragraphs, block images (captions live on event_images), location markers and video.
// Image entries are [artId | 'cover' | 'video', caption, optional {lat, lng, ts}].
import { img, has, VIDEO_RACE, VIDEO_WEDDING } from './media.mjs';
import { USERS } from './cast.mjs';

const P = (...lines) => lines.map((l) => `<p>${l}</p>`).join('');
const pic = (id, alt) => `<img src="${img(id)}" alt="${alt}">`;
const pin = (name, lat, lng, ts) =>
  `<span data-location-marker="" data-location-name="${name}" data-latitude="${lat}" data-longitude="${lng}" data-timestamp="${ts}" data-place-id="" class="location-marker" contenteditable="false">📍 ${name}</span>`;
const at = (s) => pin(s.name, s.lat, s.lng, s.ts);

// ================================================================ Maine coast
export const MAINE_STOPS = [
  { name: 'Portland Head Light, Maine', lat: 43.6231, lng: -70.2079, ts: '2026-08-08T16:20:00-04:00', photo: 'photo-coast-cliff' },
  { name: 'Camden harbor, Maine', lat: 44.2098, lng: -69.0648, ts: '2026-08-09T15:05:00-04:00', photo: 'photo-coast-harbour' },
  { name: 'Bar Harbor, Maine', lat: 44.3876, lng: -68.2039, ts: '2026-08-10T15:40:00-04:00', photo: 'photo-coast-beach' },
  { name: 'Cadillac Mountain, Maine', lat: 44.3527, lng: -68.2251, ts: '2026-08-12T10:15:00-04:00', photo: 'photo-coast-summit' },
  { name: 'Jordan Pond, Maine', lat: 44.32, lng: -68.254, ts: '2026-08-13T15:30:00-04:00', photo: 'photo-coast-pond' },
  { name: 'Bass Harbor Head Light, Maine', lat: 44.222, lng: -68.3373, ts: '2026-08-14T19:10:00-04:00', photo: 'photo-coast-van' },
];
const M = MAINE_STOPS;

const MAINE_BODY = [
  '<h1>The plan</h1>',
  P(
    'The plan, written on the back of an envelope in March, was simple: one week, one borrowed camper van, and the coast of Maine from Portland up to Acadia. We would drive a little every day, walk a lot, and eat lobster rolls until somebody asked us to stop. Ivy would carry her own water. Leo would carry nothing and complain about it. Biscuit would be a credit to us all.',
    'Two of those things happened. I will let you guess which.',
  ),
  '<h1>Portland to Camden</h1>',
  P(`We started at ${at(M[0])}, because you have to, with the whole family lined up on the path and the lighthouse behind us looking exactly like every postcard we have ever been sent. Leo rode on Tom's shoulders. Ivy pointed at the ocean and announced that she could see Spain. She could not see Spain.`),
  '<h2>The ice cream incident</h2>',
  P(
    `The next afternoon we sat on the harbor wall in ${at(M[1])} with an ice cream each, lobster boats bobbing in front of us and a stack of traps taller than Tom behind. A seagull watched Leo with real professional interest. The seagull got the ice cream. Leo got a second ice cream. Tom got a lecture from a lady in a sun hat about feeding the gulls, which he took very graciously considering he had not fed anything to anybody.`,
  ),
  pic('photo-coast-harbour', 'The family on the harbor wall in Camden with ice cream cones, lobster boats behind'),
  '<h1>Bar Harbor</h1>',
  P(
    `We made ${at(M[2])} our base for four nights, which meant four mornings of blueberry pancakes and four afternoons at Sand Beach, a little curve of pale sand tucked between granite cliffs just down the road. The water is about as warm as a glass of iced tea. The kids did not care.`,
  ),
  '<h2>Biscuit meets the Atlantic</h2>',
  P(
    'Biscuit has lived his whole life within two miles of a lake and has never once gone in it. He looked at the ocean for a long time. Then Leo ran in, and Biscuit decided that whatever was happening, he was not going to be left out of it.',
  ),
  pic('photo-coast-beach', 'Leo and Biscuit running at the edge of the sea on a wide sandy beach'),
  P('He came out, shook himself all over my book, and went straight back in. We have a sea dog now. The car still smells of it.'),
  '<h1>The top of Cadillac</h1>',
  P(
    `We had read that people drive up ${at(M[3])} in the dark to see the first sunrise in the country. We looked at our children and decided to see the fourth or fifth sunrise instead, at a civilized hour. It was still worth it. The top is bare pink granite, the bay below is full of little green islands, and the wind tries very hard to take your hat.`,
  ),
  pic('photo-coast-summit', 'The family on pink granite at the summit, island-dotted bay below'),
  P('Ivy took forty photos of the same view and says each one is different. She is not wrong.'),
  '<h1>Jordan Pond</h1>',
  P(
    `${at(M[4])} was our slow day. The water is so clear you can count the stones on the bottom, and the two round hills at the far end are called the Bubbles, which Leo found hilarious for about an hour. Tom taught both kids to skim stones. Leo's record is one skip. He is very proud of it.`,
  ),
  pic('photo-coast-pond', 'The family skimming stones at Jordan Pond, two rounded hills behind'),
  P('We had popovers with strawberry jam at the tea house on the lawn, which is the kind of tradition I could happily adopt for the rest of my life.'),
  '<h1>The last lighthouse</h1>',
  P(
    `For the last night we moved the van to a campground pitch near ${at(M[5])}, cream and red and about forty years old, with a fold-out table, a two-burner stove and a sliding door that only opened if you said something nice to it first.`,
  ),
  pic('photo-coast-van', 'The cream and red camper van on a clifftop pitch with a washing line and camp chairs'),
  '<h2>Washing line diplomacy</h2>',
  P(
    'By then the washing line was the most important thing we owned. Wet socks, wet towels, one wet dog blanket that never truly dried. Our neighbors had a line too, and there was a quiet competition about whose was tidier. They won. We had Biscuit, who borrowed one of their dish towels and would not give it back.',
    'We walked down at sunset to watch the light come on over the rocks, and nobody said much on the way back.',
    'Six stops, one lost ice cream, one converted dog, two very tan children and one van we were sad to give back. Tom has already found next year\'s envelope.',
  ),
].join('');

// ================================================================ Tetons (the showcase)
// Thirteen stops (ROUND2.md) and thirty photos, each with its own place and time (14 to 20 June 2026, MDT).
export const TETON_STOPS = [
  { name: 'Jackson Town Square, Wyoming', lat: 43.4799, lng: -110.7624, ts: '2026-06-14T17:40:00-06:00', photo: 'photo-tetons-01' },
  { name: 'Mormon Row, Wyoming', lat: 43.6608, lng: -110.6653, ts: '2026-06-15T06:10:00-06:00', photo: 'photo-tetons-04' },
  { name: 'Schwabacher Landing, Wyoming', lat: 43.7109, lng: -110.6719, ts: '2026-06-15T08:05:00-06:00', photo: 'photo-tetons-06' },
  { name: 'Jenny Lake, Wyoming', lat: 43.751, lng: -110.7228, ts: '2026-06-16T09:20:00-06:00', photo: 'photo-tetons-08' },
  { name: 'Hidden Falls, Wyoming', lat: 43.7654, lng: -110.7447, ts: '2026-06-16T10:15:00-06:00', photo: 'photo-tetons-09' },
  { name: 'Inspiration Point, Wyoming', lat: 43.7663, lng: -110.743, ts: '2026-06-16T11:05:00-06:00', photo: 'photo-tetons-10' },
  { name: 'Taggart Lake, Wyoming', lat: 43.7069, lng: -110.7541, ts: '2026-06-17T11:30:00-06:00', photo: 'photo-tetons-13' },
  { name: "Snake River float (Deadman's Bar), Wyoming", lat: 43.7598, lng: -110.6234, ts: '2026-06-18T09:30:00-06:00', photo: 'photo-tetons-16' },
  { name: 'Oxbow Bend, Wyoming', lat: 43.866, lng: -110.549, ts: '2026-06-18T18:20:00-06:00', photo: 'photo-tetons-19' },
  { name: 'Signal Mountain, Wyoming', lat: 43.8504, lng: -110.5713, ts: '2026-06-19T09:00:00-06:00', photo: 'photo-tetons-21' },
  { name: 'Colter Bay, Wyoming', lat: 43.902, lng: -110.6413, ts: '2026-06-19T14:10:00-06:00', photo: 'photo-tetons-23' },
  { name: 'String Lake, Wyoming', lat: 43.787, lng: -110.729, ts: '2026-06-20T09:40:00-06:00', photo: 'photo-tetons-26' },
  { name: 'Teton Village tram, Wyoming', lat: 43.5875, lng: -110.8279, ts: '2026-06-20T13:15:00-06:00', photo: 'photo-tetons-28' },
];
const T = Object.fromEntries(TETON_STOPS.map((s, i) => [i + 1, s]));
const near = (s, dLat, dLng, ts) => ({ lat: +(s.lat + dLat).toFixed(5), lng: +(s.lng + dLng).toFixed(5), ts });
const MOOSE = { lat: 43.6596, lng: -110.7133 };
const OVERLOOK = { lat: 43.754, lng: -110.6235 };

// [id, caption, where/when]
const TETON_PHOTOS = [
  ['photo-tetons-01', 'Day 1. Under the antler arches on the town square. Leo counted the antlers and gave up at eleven.', near(T[1], 0, 0, T[1].ts)],
  ['photo-tetons-02', 'Somewhere past the state line. The mountains in the window, the sun hat over the face.', near(T[1], -0.0102, 0.0083, '2026-06-14T15:05:00-06:00')],
  ['photo-tetons-03', 'Burgers and milkshakes to celebrate fourteen hours in the car.', near(T[1], 0.0004, -0.0007, '2026-06-14T18:30:00-06:00')],
  ['photo-tetons-04', 'Day 2, six in the morning. The old barn on Mormon Row with the whole range lit up behind it.', near(T[2], 0, 0, T[2].ts)],
  ['photo-tetons-05', 'Tom and Ivy on the fence, watching the light come down the peaks.', near(T[2], 0.0003, 0.0004, '2026-06-15T06:25:00-06:00')],
  ['photo-tetons-06', 'Schwabacher Landing. No wind, no ripples, two mountain ranges.', near(T[3], 0, 0, T[3].ts)],
  ['photo-tetons-07', 'Leo found the beaver dam and explained it to us at length.', near(T[3], 0.0004, -0.0003, '2026-06-15T08:30:00-06:00')],
  ['photo-tetons-08', 'Day 3. The shuttle boat across Jenny Lake, peaks close enough to touch.', near(T[4], 0, 0, T[4].ts)],
  ['photo-tetons-09', 'Hidden Falls, which is very well hidden until it is suddenly very loud.', near(T[5], 0, 0, T[5].ts)],
  ['photo-tetons-10', 'Inspiration Point. We were inspired, mostly to sit down.', near(T[6], 0, 0, T[6].ts)],
  ['photo-tetons-11', 'Boots off, feet over the water, back at the dock.', near(T[4], -0.0021, 0.0035, '2026-06-16T14:40:00-06:00')],
  ['photo-tetons-12', 'Day 4. The Taggart Lake trail, aspens and wildflowers all the way.', near(T[7], -0.0062, 0.0141, '2026-06-17T10:20:00-06:00')],
  ['photo-tetons-13', 'Taggart Lake. The clearest water any of us has ever seen.', near(T[7], 0, 0, T[7].ts)],
  ['photo-tetons-14', 'Lunch on a flat rock. Ivy drew the mountains; the mountains were better.', near(T[7], 0.0005, 0.0006, '2026-06-17T12:15:00-06:00')],
  ['photo-tetons-15', 'The little log chapel at Moose. The best window in Wyoming.', { ...MOOSE, ts: '2026-06-17T16:00:00-06:00' }],
  ['photo-tetons-16', "Day 5. Life jackets on, a guide at the oars, Deadman's Bar behind us.", near(T[8], 0, 0, T[8].ts)],
  ['photo-tetons-17', 'A bald eagle, exactly where the guide said it would be.', near(T[8], 0.0154, -0.0121, '2026-06-18T10:20:00-06:00')],
  ['photo-tetons-18', 'Ivy, one hand in the river, the happiest she was all week.', near(T[8], 0.0231, -0.0188, '2026-06-18T10:55:00-06:00')],
  ['photo-tetons-19', 'Oxbow Bend at dinnertime. A bull moose, standing in the shallows like he owned it.', near(T[9], 0, 0, T[9].ts)],
  ['photo-tetons-20', 'Everyone watching the moose. Biscuit was not invited, and has not forgiven us.', near(T[9], 0.0003, 0.0005, '2026-06-18T18:35:00-06:00')],
  ['photo-tetons-21', 'Day 6. The top of Signal Mountain, the whole valley laid out underneath.', near(T[10], 0, 0, T[10].ts)],
  ['photo-tetons-22', 'Us, at the top, before the wind took Tom\'s hat.', near(T[10], 0.0002, -0.0003, '2026-06-19T09:15:00-06:00')],
  ['photo-tetons-23', 'The red canoe on Colter Bay. Four paddles, one direction, eventually.', near(T[11], 0, 0, T[11].ts)],
  ['photo-tetons-24', 'Leo\'s fish. It was released, with a speech.', near(T[11], 0.0009, 0.0012, '2026-06-19T15:30:00-06:00')],
  ['photo-tetons-25', 'Marshmallows by the cabin. Nobody burned theirs, which is a family first.', near(T[11], -0.0011, 0.0016, '2026-06-19T19:45:00-06:00')],
  ['photo-tetons-26', 'Day 7. String Lake, shallow and clear and freezing.', near(T[12], 0, 0, T[12].ts)],
  ['photo-tetons-27', 'Tom, mid-jump, about half a second before he found out how freezing.', near(T[12], 0.0006, -0.0004, '2026-06-20T10:05:00-06:00')],
  ['photo-tetons-28', 'The tram from Teton Village, four thousand feet straight up.', near(T[13], 0, 0, T[13].ts)],
  ['photo-tetons-29', 'Waffles at the top. Worth the ride on their own.', near(T[13], 0.0181, -0.0209, '2026-06-20T13:45:00-06:00')],
  ['photo-tetons-30', 'Our last stop, the Snake River Overlook. The view everybody knows, with us small at the railing.', { ...OVERLOOK, ts: '2026-06-20T18:30:00-06:00' }],
];
const tp = (n) => TETON_PHOTOS[n - 1];
const tpic = (n) => pic(tp(n)[0], tp(n)[1]);

const TETONS_BODY = [
  '<h1>Day 1: Madison to Jackson</h1>',
  P(
    'We left Madison at five in the morning with a roof box, a cooler, two children who had been promised moose and a dog who had not been told anything. Fourteen hours later, after two states of corn and one state of nothing at all, the mountains came up over the dashboard and the whole car went quiet.',
    `We rolled into town in time to stand under the antler arches on ${at(T[1])}, which Leo had been told about and did not believe until he touched one.`,
  ),
  tpic(1), tpic(2),
  P('Dinner was burgers and milkshakes in a diner with wooden booths. Ivy laughed so hard at something Tom said about cowboy hats that she got milkshake up her nose, which made it funnier.'),
  tpic(3),
  '<h1>Day 2: Sunrise on Mormon Row</h1>',
  P(
    `The alarm went off at a quarter to five and nobody spoke to anybody. We drove out in the dark to ${at(T[2])}, where an old barn stands in the sagebrush with the whole range behind it. Then the sun came up and lit the peaks pink, one at a time, from the top down. Ivy said it looked like someone was coloring them in.`,
  ),
  tpic(4), tpic(5),
  P(`Then on to ${at(T[3])} for the famous reflection. There was no wind at all, so there were two mountain ranges, one of them upside down. Leo found a beaver dam and explained it to us at length.`),
  tpic(6), tpic(7),
  '<h1>Day 3: Jenny Lake and Inspiration Point</h1>',
  P(`We took the little shuttle boat across ${at(T[4])} instead of walking around it, which was the right decision and the first of several.`),
  tpic(8),
  P(
    `From the far shore it is a short, steep climb to ${at(T[5])}, which you hear long before you see. Then it keeps going up to ${at(T[6])}, where the lake is suddenly a long way below you and the boat looks like a bath toy.`,
  ),
  tpic(9), tpic(10),
  P('Back at the dock, Leo took his boots off and refused to put them back on until he had dangled his feet over the water for exactly as long as he wanted to.'),
  tpic(11),
  '<h1>Day 4: Taggart Lake</h1>',
  P(
    `The trail to ${at(T[7])} goes through a forest of aspens with wildflowers underneath, yellow and purple and some kind of red one nobody could name. Three miles there and back, which is the perfect distance for a five-year-old with snacks.`,
  ),
  tpic(12), tpic(13),
  P('We ate lunch on a big flat rock at the water\'s edge. Ivy drew the mountains in her notebook. On the way back we stopped at the tiny log chapel at Moose, which has a window behind the altar that frames the Grand Teton like a painting.'),
  tpic(14), tpic(15),
  '<h1>Day 5: The Snake River</h1>',
  P(
    `The float trip put in at ${at(T[8])}: a big rubber raft, life jackets for everyone, and a guide called Jen who knew every bird by name. The river is gentle here, fast and green, and you sit and watch the range slide past.`,
  ),
  tpic(16), tpic(17), tpic(18),
  P(`That evening we drove up to ${at(T[9])} because someone at the campground had said the word moose. There he was, standing in the shallows like he owned the place, which I suppose he does. We watched him for half an hour. He did not look at us once.`),
  tpic(19), tpic(20),
  '<h1>Day 6: Signal Mountain and Colter Bay</h1>',
  P(`In the morning we drove to the top of ${at(T[10])}, where the whole valley is laid out underneath you: the lake, the river, the range, and somewhere down there our car with the roof box.`),
  tpic(21), tpic(22),
  P(
    `In the afternoon we rented a red canoe at ${at(T[11])}. It took us ten minutes to agree which way was forward. Leo caught a fish roughly the size of his thumb and released it with a short speech.`,
    'We spent the evening toasting marshmallows outside a log cabin. Nobody burned theirs, which is a family first.',
  ),
  tpic(23), tpic(24), tpic(25),
  '<h1>Day 7: String Lake and the tram</h1>',
  P(`Our last morning was at ${at(T[12])}, which is shallow and clear and so cold it makes you shout. The kids waded. Tom jumped off a rock, against advice, and came up making a noise I have never heard from him before.`),
  tpic(26), tpic(27),
  P(`Then the ${at(T[13])}, four thousand feet straight up in a red cabin, and waffles at the top, which were worth the ride on their own.`),
  tpic(28), tpic(29),
  P(
    'On the way out of the park we stopped one last time at the Snake River Overlook, the view everybody knows, and stood at the railing for a long time without saying much.',
    'Seven days, thirteen stops, one moose, one eagle, one very small fish. Ivy has already asked if we can come back when she is ten.',
  ),
  tpic(30),
].join('');

// ================================================================ Maui
const MAUI_STOP = { name: "Ka'anapali Beach, Maui", lat: 20.926, lng: -156.695 };
const MAUI_BODY = [
  '<h1>Spring break</h1>',
  P(
    `It was minus four in Madison when we left and eighty-two when we landed, and nobody has ever taken off a winter coat faster than Leo did in that parking lot. We stayed a week at ${pin(MAUI_STOP.name, MAUI_STOP.lat, MAUI_STOP.lng, '2026-03-22T10:00:00-10:00')}, which is long and golden and has a sea turtle every morning if you are patient.`,
  ),
  pic('photo-maui-beach', 'The family on a long golden beach with palms, Leo building a sand volcano'),
  '<h2>Under the water</h2>',
  P('Ivy snorkeled every single day. On the third day she saw a turtle up close and came out of the water so excited she could not say the word turtle.'),
  pic('photo-maui-snorkel', 'Ivy and Tom in snorkel masks at the surface of clear turquoise water'),
  pic('photo-maui-shave-ice', 'The kids with rainbow shave ice'),
  '<h1>Above the clouds</h1>',
  P('On the last morning we drove up the volcano in the dark, wrapped in hotel blankets, and watched the sun come up over a sea of clouds. Leo fell asleep halfway through. It still counts.'),
  pic('photo-maui-sunrise', 'The four wrapped in blankets above a sea of cloud on the volcano at sunrise'),
].join('');

// ================================================================ Wedding
const WEDDING_PLACE = { name: 'Hudson Valley, New York', lat: 41.7004, lng: -73.921 };
const WEDDING_BODY = [
  '<h1>Getting ready</h1>',
  P(
    'Kate has been my sister-in-law for twelve years and my friend for longer than that, so when she asked me to be the one who wrote this up, I said yes before she had finished the sentence. Here it is, Kate. You can fix my spelling later.',
    'They got married on a Saturday in May at an old red barn in the Hudson Valley, with an orchard on one side and a field of long grass on the other. The morning was all hairpins and coffee. Ivy had been made official flower girl and took the job very seriously, which mostly meant sitting very still in her flower crown and watching every single pin go in.',
  ),
  pic('photo-wedding-ready', 'Kate having her hair pinned, Ivy watching in her flower crown'),
  '<h1>The aisle</h1>',
  P(
    'The aisle was mown into the grass that morning, between rows of borrowed chairs. Ivy went first, scattering petals in perfectly even handfuls, as practiced, and then forgot the plan halfway and threw the whole basket at Grandpa Joe. Everyone turned round to watch. Nobody minded.',
  ),
  pic('photo-wedding-aisle', 'Ivy scattering petals down a grass aisle, guests turning to watch'),
  '<h1>The vows</h1>',
  P(
    'They wrote their own. Marcus promised to always let Kate have the window seat. Kate promised to learn which way round the dishwasher goes. Then they both got serious for about a minute, under an arch of white flowers that Ruth had spent three days building, and there was not a dry eye in the field. Finn, fourteen and very grown up in a borrowed suit, handed over the rings without dropping either one, and then looked enormously relieved.',
  ),
  pic('photo-wedding-vows', 'Kate and Marcus under the flower arch, hands joined'),
  P('Then they walked back down the aisle through a storm of petals, and the whole family lined up in front of the barn for the one photo where everybody is looking the same way.'),
  pic('photo-wedding-family', 'The whole family lined up in front of the barn'),
  '<h1>The speeches</h1>',
  P(
    'Tom gave the brother-of-the-bride speech. He had practiced it on me nine times and on the dog twice. It had a story about Kate driving the family car into a mailbox when she was seventeen, which she has never admitted, and a list of all the boyfriends Tom had not approved of before Marcus, which was long. Kate laughed so hard she had to cover her face.',
  ),
  pic('photo-wedding-speech', 'Tom mid-speech with a microphone, Kate laughing with her hand over her face'),
  P('Marcus filmed his own wedding speeches, of course. Here is the bit everyone has asked for.'),
  `<video src="${VIDEO_WEDDING}" controls="true"></video>`,
  '<h1>The dancing</h1>',
  P(
    'Grandpa Joe is seventy this year and is still the best dancer in any room. He danced with every single person there, oldest to youngest, and finished with Ivy, who stood on his shoes for the whole song.',
  ),
  pic('photo-wedding-dance', 'Grandpa Joe dancing with Ivy standing on his shoes'),
  P(
    'The band played until midnight. Ruth and her sister took over the floor for one song and would not give it back. Finn, who had sworn he would not dance under any circumstances, was spotted dancing under several circumstances. Biscuit, who was not invited, appeared at nine o\'clock having escaped from the car, and was allowed to stay on the condition that he did not eat the cake. He ate some of the cake.',
  ),
  P(
    'At the end of the night we all lined the path with sparklers and Kate and Marcus ran through the middle, laughing, out to the car and off to Italy. Leo, who was supposed to be asleep, waved his sparkler like a lightsaber the whole time.',
    'Congratulations, you two. We love you.',
  ),
  pic('photo-wedding-sparklers', 'The couple leaving through a tunnel of sparklers at blue hour'),
].join('');

// ================================================================ Kitchen
const KITCHEN_BODY = [
  '<h1>Before</h1>',
  P(
    'Our kitchen was orange. Not a fun orange. A tired, eighties, knotty-pine orange, with a drawer that came out in your hand and an oven door you had to hold shut with your hip. We said we would do something about it every January for six years.',
    'This January we did. Six weeks, the contractor said. He was right, which nobody believed at the time.',
  ),
  pic('photo-kitchen-before', 'The old orange pine kitchen, empty'),
  P('I took this the night before demo day so we would remember. We will not be framing it.'),
  '<h1>Demo day</h1>',
  P(
    'Tom insisted on doing the first cabinet himself. He bought safety goggles specially. He made a short speech. Then he swung the sledgehammer and the cabinet door, which had been hanging on by one hinge since 2019, simply fell off before he hit it.',
    'He hit the cabinet anyway. You can see the dust.',
  ),
  pic('photo-kitchen-sledge', 'Tom in goggles mid-swing at a cabinet, dust in the air'),
  P('By the end of the first weekend the room was a shell: bare drywall, a pipe sticking out of the wall, and a square of linoleum under where the fridge had been that was still its original color. It was yellow. Who knew.'),
  '<h1>Living on a camping stove</h1>',
  P('For four weeks we cooked on a two-burner camping stove on the living room floor. We ate a lot of pasta. We ate a lot of things that started out as pasta and were then called something else.'),
  '<h2>Pizza Fridays</h2>',
  P('Fridays were takeout pizza on a picnic blanket in front of the TV, and by week three the kids were asking if we could keep doing it when the kitchen was finished. We said no. We have done it twice since.'),
  pic('photo-kitchen-camping', 'The family eating pizza on the living room floor around a camping stove and a kettle'),
  '<h1>Tile and paint</h1>',
  P('I laid the floor tile myself, which I would like noted. Patterned, blue and white, the ones I had been looking at for about four years. It took two full days and one evening where I sat on the floor and told the tile exactly what I thought of it.'),
  pic('photo-kitchen-tiling', 'Maya kneeling on the floor laying patterned tile'),
  P('The kids were in charge of painting the cabinet doors. Sage green. Two coats, out on the deck on the only dry weekend in February. Leo was very careful and very slow and somehow still got paint on his nose, his ear and the dog.'),
  pic('photo-kitchen-paint', "Ivy and Leo painting a cabinet door sage green, paint on Leo's nose"),
  '<h1>The first pancakes</h1>',
  P(
    'Six weeks to the day, the contractor put on the last handle, ran the faucet for us like a magician, and left. We stood in the doorway for a bit, not quite sure we were allowed in.',
    'Then Ivy asked for pancakes, and that settled it. Tom made the first batch on the new stove. The first one stuck, as the first one always does. Nobody minded. We ate standing up around the island because we had not bought the stools yet, and it was the best breakfast we have had in that house.',
    'The drawer still works. We check most days.',
  ),
].join('');

// ================================================================ Marathon (Chicago)
const RACE_BODY = [
  '<h1>The start</h1>',
  P(
    'A year ago I could not run for a bus. I know that because I tried, and the driver watched me in his mirror, and drove off. Sam from run club said I should sign up for the marathon, and I laughed, and then he made me do it on his phone at the bar before I could change my mind.',
    'Eighteen weeks of training later, we were standing in a corral in Grant Park at half past seven in the morning with forty thousand other people and a man dressed as a banana.',
  ),
  pic('photo-race-start', 'Tom and Sam among the runners at the start line'),
  '<h2>The plan</h2>',
  P('The plan was to go out slowly, stay with Sam until halfway, and then hold on. Deb, who has run more marathons than I have had hot dinners, said the plan was fine, that the plan always goes wrong at mile twenty, that this is normal, and that I should eat a gummy bear when it does.'),
  '<h1>The wall</h1>',
  P('At mile twenty, the plan went wrong. My legs just stopped being legs. They became two separate things that happened to be attached to me and had their own opinions. I grabbed a cup of water from a volunteer, poured most of it down my shirt, and walked for a bit.'),
  pic('photo-race-mile20', 'Tom mid-race, looking pained, grabbing a cup of water'),
  P('I ate a gummy bear. It did not help. I ate another one. It did not help either, but by then I had started running again, mostly out of embarrassment, because a woman who looked about eighty had just gone past me, and she was waving.'),
  '<h1>The people who came</h1>',
  P(
    'Here is the part nobody tells you. The crowd does half the work. Every mile there are strangers shouting your name off your bib, and they mean it, and it is the most extraordinary thing.',
    'And then at mile twenty-two there were people who were not strangers.',
  ),
  '<h2>The star sign</h2>',
  P('Ivy and Leo had made a sign the night before. It said nothing. Leo had argued for GO DAD and Ivy had argued for something longer, and in the end they compromised on a very large drawn star, colored in, which they held up together and shook. Mom was behind them with a thermos. I cried. I am not ashamed of it.'),
  pic('photo-race-kids', 'Ivy and Leo at the barrier holding a sign with a big drawn star, Nana Ruth behind them'),
  '<h1>The finish</h1>',
  P('The last mile goes on for about a week. Then you turn the corner onto the final stretch, and there it is, and you remember that you have arms and you put them up. Marcus filmed the last stretch from the barrier. You can hear Leo shouting the whole way.'),
  `<video src="${VIDEO_RACE}" controls="true"></video>`,
  P('Four hours, forty-one minutes and some seconds. I do not care about the seconds. Maya found me in the space-blanket area, and held on, and said I smelled terrible, and did not let go.'),
  pic('photo-race-hug', 'Maya hugging Tom in his foil blanket'),
  '<h2>Fries</h2>',
  P('Afterwards we went to a diner around the corner, all of us and Sam, medals on, and ordered every basket of fries they had. Sam is already talking about next year. I have told him no about four times, which, as everyone in my family knows, means yes.'),
  pic('photo-race-chips', 'The family and Sam at a diner table with fries, medals on'),
].join('');

// ================================================================ Ivy nine, Joe seventy
const IVY_BODY = [
  '<h1>The party</h1>',
  P(
    'Ivy is nine. She wanted a small party, "just family", and then sent us a list of who counted as family, which included her swim coach and the lady from the bakery. We negotiated.',
    'In the end it was the grandparents, Kate and Marcus and Finn, and a cake shaped like a swimming pool that I made at eleven o\'clock the night before. The water was blue frosting. The swimmers were gummy bears. Tom ate the lifeguard.',
  ),
  '<h2>Nine candles</h2>',
  P('Grandpa Joe wore a paper crown for the entire afternoon and refused to take it off for the photos, or for the drive home. She blew out all nine candles in one go and then announced she would not be telling anyone the wish, "not even Biscuit".'),
  '<h1>The year she was eight</h1>',
  P('Looking back, eight was a big year. She built a rocket in the backyard out of the boxes from the new kitchen, and took Leo to the moon in it most weekends.'),
  pic('photo-year-rocket', 'Ivy and Leo in the cardboard rocket in the backyard'),
  P('And in July she won her first swim meet race, fifty meters backstroke, by about the length of a fingernail. She keeps the trophy on her windowsill, facing out, so the street can see it.'),
  pic('photo-year-gala', 'Ivy on the pool deck with a small trophy, a towel around her shoulders'),
  P('Happy birthday, Ivy. We love you to the moon and back, by rocket.'),
].join('');

const JOE_BODY = [
  '<h1>Seventy</h1>',
  P(
    'Joe said he did not want a fuss. Maya said he was getting a fuss. Maya won, as she does, and on the second Saturday of December we all flew down to Florida, put two tables end to end in his backyard, borrowed every chair on the street, and fed thirty people.',
    'It was seventy-five degrees, which Joe pointed out to everyone from Wisconsin, several times.',
  ),
  '<h2>The speech</h2>',
  P('Marcus did a speech. It had slides. Some of the slides were photos of Joe in the seventies with a mustache we had all been told was a myth. Joe laughed until he had to sit down, and then he stood up and did a speech of his own, which was shorter, and better, and made Ruth cry.'),
  has('plate-year-d') ? pic('plate-year-d', "The whole family around the long garden table at Grandpa Joe's seventieth") : '',
  '<h1>The dancing</h1>',
  P('Then he put a record on and danced with every single person there, oldest to youngest, finishing with Leo, who stood on his feet. Seventy years old and still the best dancer at his own party. Happy birthday, Joe.'),
].join('');

// ================================================================ relatives
const JOE_TRIP_BODY = [
  '<h1>Galway</h1>',
  P(
    'Two weeks in the west of Ireland, where my mother\'s people came from. I found the street. I found the church. I did not find a single person who had heard of us, but every one of them bought me a drink anyway.',
    'The harbor here is all painted fronts, red and blue and yellow, and the music starts in the afternoon and does not stop.',
  ),
  '<h2>The weather</h2>',
  P('It rained every day, and then the sun came out every day, sometimes in the same ten minutes. Ivy, I have brought you a sweater. It is the itchiest thing I have ever owned. You will love it.'),
].join('');

const AMALFI_BODY = [
  '<h1>Ten days on the Amalfi coast</h1>',
  P(
    'A honeymoon on the side of a cliff. Every town here is stacked straight up from the water in pink and yellow and white, and every staircase has four hundred steps, and at the top of every staircase there is a lemon.',
    'We ate pasta on a terrace every night and watched the ferries come in. Kate says I took more photos of the food than of her. I have counted. She is right.',
  ),
  '<h2>The boat</h2>',
  P('One day we hired a little boat and went round the headland to a cove you can only reach from the sea. We swam. We did not see another person for three hours. Then we came home and showed everyone four hundred photos of it.'),
].join('');

const RUTH_BODY = [
  '<h1>North to Alaska</h1>',
  P(
    'Seven days on a ship up the Inside Passage with my sister Margaret. I stood on the deck every morning in my headscarf with a cup of tea and watched the forest go by, and saw two whales, a family of sea otters and something Margaret insists was a bear.',
    'In Juneau we took a little boat out to the glacier, which is blue, really blue, like the inside of an ice cube.',
  ),
  '<h2>Things we did</h2>',
  P('Read a lot. Ate too much. Found a bakery that does a cinnamon roll the size of Leo\'s head. Sent the children a postcard each, which will arrive after I do.'),
].join('');

// ================================================================ assemble
export const STORIES = [
  {
    key: 'coast', id: 103, slug: 'a-week-on-the-maine-coast', author: 'maya',
    title: 'A week on the Maine coast', short_title: 'The Maine coast',
    summary: 'Portland to Acadia with a borrowed camper van, two kids, one terrier and a seagull with ambitions.',
    start_date: '2026-08-08T10:00:00', end_date: '2026-08-15T10:00:00', created_at: '2026-08-17T19:30:00Z',
    location_name: 'Portland, Maine', latitude: M[0].lat, longitude: M[0].lng,
    cover: ['cover-coast', 'photo-coast-cliff'], category: 'Vacation', category_2: null, privacy_level: 'followers',
    body: MAINE_BODY,
    images: [
      ['cover', 'Portland Head Light, day one. Ivy could see Spain. Ivy could not see Spain.'],
      ['photo-coast-harbour', 'Camden harbor, ten minutes before the seagull struck.'],
      ['photo-coast-beach', 'Sand Beach, near Bar Harbor. The moment Biscuit became a sea dog.'],
      ['photo-coast-summit', 'The top of Cadillac Mountain, at a civilized hour.'],
      ['photo-coast-pond', 'Skimming stones at Jordan Pond. Leo\'s record: one skip.'],
      ['photo-coast-van', 'The last night, near Bass Harbor Head Light. The door needs to be spoken to nicely.'],
    ],
    stops: MAINE_STOPS,
  },
  {
    key: 'tetons', id: 110, slug: 'seven-days-in-the-tetons', author: 'tom',
    title: 'Seven days in the Tetons', short_title: 'The Tetons',
    summary: 'Fourteen hours in the car, seven days in the mountains, one moose, one eagle and one very small fish.',
    start_date: '2026-06-14T05:00:00', end_date: '2026-06-20T18:30:00', created_at: '2026-06-22T20:10:00Z',
    location_name: 'Jackson, Wyoming', latitude: T[1].lat, longitude: T[1].lng,
    cover: ['cover-tetons', 'photo-tetons-30'], category: 'Vacation', category_2: null, privacy_level: 'followers',
    body: TETONS_BODY,
    images: [['cover', 'The Snake River Overlook on our way out. Seven days, thirteen stops.', { ...OVERLOOK, ts: '2026-06-20T18:30:00-06:00' }], ...TETON_PHOTOS],
    stops: TETON_STOPS,
  },
  {
    key: 'maui', id: 111, slug: 'spring-break-in-maui', author: 'maya',
    title: 'Spring break in Maui', short_title: 'Maui',
    summary: 'From minus four in Madison to a sea turtle every morning.',
    start_date: '2026-03-21T12:00:00', end_date: '2026-03-28T12:00:00', created_at: '2026-03-29T18:00:00Z',
    location_name: "Ka'anapali, Maui", latitude: MAUI_STOP.lat, longitude: MAUI_STOP.lng,
    cover: ['cover-maui', 'photo-maui-beach'], category: 'Vacation', category_2: null, privacy_level: 'followers',
    body: MAUI_BODY,
    images: [
      ['cover', "Ka'anapali Beach and the volcano Leo built."],
      ['photo-maui-snorkel', 'Turtle spotters.'],
      ['photo-maui-shave-ice', 'Rainbow shave ice, every flavor at once.'],
      ['photo-maui-sunrise', 'Sunrise above the clouds. Leo slept through the best bit.'],
    ],
  },
  {
    key: 'wedding', id: 112, slug: 'kate-and-marcus-get-married', author: 'maya',
    title: 'Kate and Marcus get married', short_title: 'The wedding',
    summary: 'An old red barn, a flower girl with a strong arm, and a speech practiced on the dog.',
    start_date: '2026-05-16T14:00:00', end_date: '2026-05-16T14:00:00', created_at: '2026-05-18T21:15:00Z',
    location_name: 'Hudson Valley, New York', latitude: WEDDING_PLACE.lat, longitude: WEDDING_PLACE.lng,
    cover: ['cover-wedding', 'photo-wedding-confetti'], category: 'Wedding', category_2: null, privacy_level: 'followers',
    body: WEDDING_BODY,
    images: [
      ['cover', 'Down the aisle and out through the petals. Mr. and Mrs., at last.'],
      ['photo-wedding-ready', 'Hairpins, coffee and one very serious flower girl.'],
      ['photo-wedding-aisle', 'Ivy, moments before she threw the whole basket at Grandpa Joe.'],
      ['photo-wedding-vows', 'Under the arch Ruth spent three days building.'],
      ['photo-wedding-family', 'Everyone, looking the same way, just this once.'],
      ['photo-wedding-speech', 'Tom gets to the part about the mailbox.'],
      ['video', 'The speeches, filmed by the groom.'],
      ['photo-wedding-dance', 'Grandpa Joe and his best dance partner.'],
      ['photo-wedding-sparklers', 'Off to Italy.'],
    ],
  },
  {
    key: 'kitchen', id: 101, slug: 'six-weeks-without-a-kitchen', author: 'maya',
    title: 'Six weeks without a kitchen', short_title: 'Without a kitchen',
    summary: 'We took the kitchen down to the studs in February and lived on a camping stove until the first pancakes.',
    start_date: '2026-02-01T09:00:00', end_date: '2026-03-14T09:00:00', created_at: '2026-03-15T18:20:00Z',
    location_name: 'Madison, Wisconsin', latitude: 43.0731, longitude: -89.4012,
    cover: ['cover-kitchen', 'photo-kitchen-done'], category: 'Project', category_2: null, privacy_level: 'followers',
    body: KITCHEN_BODY,
    images: [
      ['cover', 'Week six. The first pancakes, standing up, because we had not bought the stools yet.'],
      ['photo-kitchen-before', 'The night before. Goodbye, orange.'],
      ['photo-kitchen-sledge', 'Tom and the cabinet that fell off by itself.'],
      ['photo-kitchen-camping', 'Pizza Friday on the living room floor, week three.'],
      ['photo-kitchen-tiling', 'Day two of tiling. Still speaking to the tile, just.'],
      ['photo-kitchen-paint', 'Sage green, two coats, one nose.'],
    ],
  },
  {
    key: 'race', id: 102, slug: 'dads-first-marathon', author: 'tom',
    title: "Dad's first marathon", short_title: 'First marathon',
    summary: 'Eighteen weeks of training, one wall at mile twenty, and a sign with a star on it.',
    start_date: '2026-10-11T07:30:00', end_date: '2026-10-11T07:30:00', created_at: '2026-10-12T20:05:00Z',
    location_name: 'Grant Park, Chicago', latitude: 41.8756, longitude: -87.6244,
    cover: ['cover-marathon', 'photo-race-finish'], category: 'Milestone', category_2: null, privacy_level: 'custom_group', custom_group_id: 31,
    body: RACE_BODY,
    images: [
      ['cover', 'The finish. I remembered I had arms.'],
      ['photo-race-start', 'Half past seven, the start corral, Sam pretending he is not nervous.'],
      ['photo-race-mile20', 'Mile twenty. The wall is real.'],
      ['photo-race-kids', 'Mile twenty-two. The star sign. Mom with the thermos.'],
      ['video', 'The final stretch, filmed by Marcus. Turn the sound up for Leo.'],
      ['photo-race-hug', 'Space blanket, terrible smell, best hug.'],
      ['photo-race-chips', 'Every basket of fries in the building.'],
    ],
  },
  {
    key: 'year', id: 104, slug: 'ivy-turns-nine', author: 'maya',
    title: 'Ivy turns nine', short_title: 'Ivy turns nine',
    summary: 'A swimming-pool cake, nine candles and a wish she will not tell Biscuit.',
    start_date: '2026-11-14T14:00:00', end_date: '2026-11-14T14:00:00', created_at: '2026-11-15T09:10:00Z',
    location_name: 'Madison, Wisconsin', latitude: 43.0731, longitude: -89.4012,
    cover: ['cover-birthday', 'photo-year-birthday'], category: 'Birthday', category_2: null, privacy_level: 'close_family',
    body: IVY_BODY,
    images: [
      ['cover', 'Nine candles, one go. Grandpa Joe in the crown he would not take off.'],
      ['photo-year-rocket', 'Ground control to Leo.'],
      ['photo-year-gala', 'Fifty meters backstroke, won by a fingernail.'],
    ],
  },
  {
    key: 'joe70', id: 105, slug: 'grandpa-joe-at-seventy', author: 'tom',
    title: 'Grandpa Joe at seventy', short_title: 'Joe at seventy',
    summary: 'Two tables end to end, every chair on the street, and a seventy-year-old who out-danced us all.',
    start_date: '2026-12-12T13:00:00', end_date: '2026-12-12T13:00:00', created_at: '2026-12-13T21:00:00Z',
    location_name: 'Sarasota, Florida', latitude: 27.3364, longitude: -82.5307,
    cover: ['cover-joe70', 'photo-year-joe70'], category: 'Family Gathering', category_2: null, privacy_level: 'followers',
    body: JOE_BODY,
    images: [
      ['cover', 'Glasses up for Joe.'],
      ...(has('plate-year-d') ? [['plate-year-d', 'Everyone, and Biscuit, before the speeches.']] : []),
    ],
  },
  {
    key: 'trip-joe', id: 106, slug: 'two-weeks-in-galway', author: 'joe',
    title: 'Two weeks in Galway', short_title: 'Galway',
    summary: 'Looking for my mother\'s street, and finding the music instead.',
    start_date: '2026-04-06T10:00:00', end_date: '2026-04-20T10:00:00', created_at: '2026-04-21T12:00:00Z',
    location_name: 'Galway, Ireland', latitude: 53.2707, longitude: -9.0568,
    cover: ['photo-trip-joe'], category: 'Vacation', category_2: null, privacy_level: 'followers',
    body: JOE_TRIP_BODY, images: [['cover', 'Outside the pub on the harbor. Rain, then sun, then rain.']],
  },
  {
    key: 'trip-amalfi', id: 107, slug: 'our-honeymoon-on-the-amalfi-coast', author: 'marcus',
    title: 'Our honeymoon on the Amalfi coast', short_title: 'Amalfi',
    summary: 'Ten days, four hundred steps a day, and a lemon at the top of every one.',
    start_date: '2026-05-19T10:00:00', end_date: '2026-05-29T10:00:00', created_at: '2026-06-01T19:00:00Z',
    location_name: 'Amalfi, Italy', latitude: 40.634, longitude: 14.6027,
    cover: ['photo-trip-amalfi', 'photo-wedding-sparklers'], category: 'Vacation', category_2: null, privacy_level: 'followers',
    body: AMALFI_BODY, images: [['cover', 'The view from our terrace, every single evening.']],
  },
  {
    key: 'trip-ruth', id: 109, slug: 'north-to-alaska', author: 'ruth',
    title: 'North to Alaska', short_title: 'Alaska',
    summary: 'A week up the Inside Passage, two whales, and a glacier the color of an ice cube.',
    start_date: '2026-07-11T11:00:00', end_date: '2026-07-18T11:00:00', created_at: '2026-07-20T16:00:00Z',
    location_name: 'Juneau, Alaska', latitude: 58.3019, longitude: -134.4197,
    cover: ['photo-trip-ruth'], category: 'Vacation', category_2: null, privacy_level: 'followers',
    body: RUTH_BODY, images: [['cover', 'Tea on deck. Margaret says the bear was real.']],
  },
];

export const byKey = Object.fromEntries(STORIES.map((s) => [s.key, s]));
export const authorOf = (s) => USERS[s.author];
