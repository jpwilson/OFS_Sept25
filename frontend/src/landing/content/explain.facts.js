// Explain package product numbers that are not in SPEC's facts table (owner: explain).
// Each src names the line read by the explain builder. Smart Import rules come from the
// constants table at the top of backend/app/utils/photo_clustering.py.
export default {
  importGapMinMinutes: { value: '45', src: 'backend/app/utils/photo_clustering.py:27' },
  importGapMaxHours: { value: '8', src: 'backend/app/utils/photo_clustering.py:28' },
  importMoveKm: { value: '5', src: 'backend/app/utils/photo_clustering.py:32' },
  importGpsBorrowMinutes: { value: '30', src: 'backend/app/utils/photo_clustering.py:34' },
  importDayStartHour: { value: '4', src: 'backend/app/utils/photo_clustering.py:35' },
  importHomeKm: { value: '50', src: 'backend/app/utils/photo_clustering.py:36' },
  importTripGapHours: { value: '40', src: 'backend/app/utils/photo_clustering.py:38' },
  importTripChainKm: { value: '200', src: 'backend/app/utils/photo_clustering.py:39' },
  importMinAlbum: { value: '5', src: 'backend/app/utils/photo_clustering.py:40' },
  importTinyMergeHours: { value: '3', src: 'backend/app/utils/photo_clustering.py:41' },
  importOrphanMax: { value: '2', src: 'backend/app/utils/photo_clustering.py:330' },
}

/**
 * Where each Smart Import rule card rests (for review; never printed on the page), keyed
 * by rule in the order the cards show them.
 * Files are under backend/app/utils/ (photo_clustering.py), backend/app/api/ (ai_creator.py)
 * and frontend/src/pages/ (SmartImport.jsx). Every line here was read by the explain builder.
 */
export const RULE_SRC = {
  pick: 'SmartImport.jsx:20, 122-147',
  undated: 'photo_clustering.py:106-112',
  order: 'photo_clustering.py:19-20, 124',
  borrow: 'photo_clustering.py:34, 132-141',
  gaps: 'photo_clustering.py:27-28, 154-158',
  between: 'photo_clustering.py:29-32, 159-169',
  home: 'photo_clustering.py:36-37, 184-189, 216-240',
  trip: 'photo_clustering.py:38-39, 260-276, 407-411',
  day: 'photo_clustering.py:35, 349-350',
  tiny: 'photo_clustering.py:40-41, 310-336',
  title: 'photo_clustering.py:353-403',
  upload: 'SmartImport.jsx:189-232 · ai_creator.py:241',
}
