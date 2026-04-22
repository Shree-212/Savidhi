-- ═══════════════════════════════════════════════════════════════════════════
-- Gen-1 Dummy Data seed — replaces 002_seed.sql content
-- Uses images served from media-service at /uploads/seed/{category}/{slug}/...
-- Run after 001_init.sql.  Idempotent: wipes dynamic tables first.
-- ═══════════════════════════════════════════════════════════════════════════

-- Clean all dynamic rows (keep admin_users from 001 bootstrap)
DELETE FROM puja_booking_devotees;
DELETE FROM chadhava_booking_offerings;
DELETE FROM chadhava_booking_devotees;
DELETE FROM puja_bookings;
DELETE FROM chadhava_bookings;
DELETE FROM appointments;
DELETE FROM puja_events;
DELETE FROM chadhava_events;
DELETE FROM payments;
DELETE FROM ledger_entries;
DELETE FROM gems_transactions;
DELETE FROM devotee_achievements;
DELETE FROM chadhava_offerings;
DELETE FROM temple_deities;
DELETE FROM pujas;
DELETE FROM chadhavas;
DELETE FROM pujaris;
DELETE FROM temples;
DELETE FROM deities;
DELETE FROM hampers;
DELETE FROM astrologers;
DELETE FROM achievements;
DELETE FROM devotees;

-- ═══ DEITIES ═══════════════════════════════════════════════════════════════
INSERT INTO deities (id, name, image_url) VALUES
  ('d1000000-0000-0000-0000-000000000001', 'Lord Shiva',       'http://localhost:4005/uploads/seed/temples/kedarnath-temple/2.jpg'),
  ('d1000000-0000-0000-0000-000000000002', 'Lord Vishnu',      'http://localhost:4005/uploads/seed/temples/ayodhya-ram-janmabhoomi-mandir/2.jpg'),
  ('d1000000-0000-0000-0000-000000000003', 'Lord Rama',        'http://localhost:4005/uploads/seed/temples/ayodhya-ram-janmabhoomi-mandir/1.jpg'),
  ('d1000000-0000-0000-0000-000000000004', 'Goddess Laxmi',    'http://localhost:4005/uploads/seed/pujas/laxmi-dhandatri-puja/1.jpg'),
  ('d1000000-0000-0000-0000-000000000005', 'Goddess Durga',    'http://localhost:4005/uploads/seed/pujas/durga-navami-upasana-puja/1.jpg'),
  ('d1000000-0000-0000-0000-000000000006', 'Goddess Kali',     'http://localhost:4005/uploads/seed/chadhavas/kali-mangala-arti-dana/1.jpg'),
  ('d1000000-0000-0000-0000-000000000007', 'Lord Bhairav',     'http://localhost:4005/uploads/seed/chadhavas/bhairav-dana-seva/1.jpg'),
  ('d1000000-0000-0000-0000-000000000008', 'Lord Shani',       'http://localhost:4005/uploads/seed/chadhavas/shani-shanti-bheta-dana/1.jpg'),
  ('d1000000-0000-0000-0000-000000000009', 'Lord Hanuman',     'http://localhost:4005/uploads/seed/temples/ayodhya-ram-janmabhoomi-mandir/3.jpg'),
  ('d1000000-0000-0000-0000-000000000010', 'Lord Ganesha',     'http://localhost:4005/uploads/seed/temples/ramanathaswamy-temple/3.jpg');

-- ═══ TEMPLES ═══════════════════════════════════════════════════════════════
INSERT INTO temples (id, name, address, pincode, google_map_link, about, history_and_significance, sample_video_url, slider_images) VALUES
  ('11000000-0000-0000-0000-000000000001',
   'Ayodhya Ram Janmabhoomi Mandir',
   'Ram Janmabhoomi Path, Ram Kot, Ayodhya, Uttar Pradesh',
   '224123',
   'https://maps.google.com/?q=Ram+Mandir+Ayodhya',
   'The magnificent Ram Mandir at Ayodhya marks the birthplace of Lord Rama, the seventh avatar of Lord Vishnu. Consecrated in January 2024, the temple stands as one of the most sacred Hindu pilgrimage sites, built in the traditional Nagara style with intricately carved pink sandstone.',
   'Ayodhya is mentioned in ancient scriptures including the Ramayana and Atharvaveda as the birthplace of Lord Rama. The site is believed to be Ram Janmabhoomi — the sacred ground where Lord Rama was born. After centuries of aspiration, the grand temple was consecrated (Pran Pratishtha) on 22 January 2024.',
   NULL,
   ARRAY[
     'http://localhost:4005/uploads/seed/temples/ayodhya-ram-janmabhoomi-mandir/1.jpg',
     'http://localhost:4005/uploads/seed/temples/ayodhya-ram-janmabhoomi-mandir/2.jpg',
     'http://localhost:4005/uploads/seed/temples/ayodhya-ram-janmabhoomi-mandir/3.jpg',
     'http://localhost:4005/uploads/seed/temples/ayodhya-ram-janmabhoomi-mandir/4.jpg',
     'http://localhost:4005/uploads/seed/temples/ayodhya-ram-janmabhoomi-mandir/5.jpg'
   ]),
  ('11000000-0000-0000-0000-000000000002',
   'Kedarnath Temple',
   'Kedarnath, Rudraprayag, Uttarakhand',
   '246445',
   'https://maps.google.com/?q=Kedarnath+Temple',
   'Kedarnath Temple, nestled in the Garhwal Himalayas at 3,583 meters, is one of the twelve Jyotirlingas of Lord Shiva. The temple is accessible only for six months a year (April/May to October/November) and is a key site on the Char Dham yatra.',
   'Built by the Pandavas and revived by Adi Shankaracharya in the 8th century, Kedarnath has stood through earthquakes and the devastating 2013 flood, emerging as a symbol of divine resilience. The triangular stone lingam inside is swayambhu (self-manifested).',
   NULL,
   ARRAY[
     'http://localhost:4005/uploads/seed/temples/kedarnath-temple/1.jpg',
     'http://localhost:4005/uploads/seed/temples/kedarnath-temple/2.jpg',
     'http://localhost:4005/uploads/seed/temples/kedarnath-temple/3.jpg',
     'http://localhost:4005/uploads/seed/temples/kedarnath-temple/4.jpg',
     'http://localhost:4005/uploads/seed/temples/kedarnath-temple/5.jpg'
   ]),
  ('11000000-0000-0000-0000-000000000003',
   'Ramanathaswamy Temple',
   'Pambam Bridge Road, Rameswaram, Tamil Nadu',
   '623526',
   'https://maps.google.com/?q=Ramanathaswamy+Temple',
   'Ramanathaswamy Temple at Rameswaram is a 12th-century Jyotirlinga dedicated to Lord Shiva, famous for its longest corridor among all Hindu temples (around 1.2 km). The temple is one of the Char Dham pilgrimage sites of India.',
   'According to the Ramayana, Lord Rama installed the Shiva lingam here to absolve the sin of killing Ravana. The lingam was crafted by Sita from sand. The temple has 22 holy wells (Theerthams) within its precincts, each with a specific spiritual significance.',
   NULL,
   ARRAY[
     'http://localhost:4005/uploads/seed/temples/ramanathaswamy-temple/1.jpg',
     'http://localhost:4005/uploads/seed/temples/ramanathaswamy-temple/2.jpg',
     'http://localhost:4005/uploads/seed/temples/ramanathaswamy-temple/3.jpg',
     'http://localhost:4005/uploads/seed/temples/ramanathaswamy-temple/4.jpg',
     'http://localhost:4005/uploads/seed/temples/ramanathaswamy-temple/5.jpg'
   ]);

-- ═══ TEMPLE <-> DEITY ═════════════════════════════════════════════════════
INSERT INTO temple_deities (temple_id, deity_id) VALUES
  ('11000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000003'),  -- Ayodhya: Rama
  ('11000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000009'),  -- Ayodhya: Hanuman
  ('11000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000001'),  -- Kedarnath: Shiva
  ('11000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000001'),  -- Ramanathaswamy: Shiva
  ('11000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000010');  -- Ramanathaswamy: Ganesha

-- ═══ PUJARIS ═══════════════════════════════════════════════════════════════
INSERT INTO pujaris (id, name, temple_id, designation, profile_pic, rating, unsettled_amount, start_date, is_active) VALUES
  ('a1100000-0000-0000-0000-000000000001', 'Acharya Satyendra Mishra',
   '11000000-0000-0000-0000-000000000001', 'Head Priest',
   'https://randomuser.me/api/portraits/men/51.jpg',
   4.8, 0, '2020-03-15', true),
  ('a1100000-0000-0000-0000-000000000002', 'Pandit Ramesh Shukla',
   '11000000-0000-0000-0000-000000000002', 'Head Priest',
   'https://randomuser.me/api/portraits/men/32.jpg',
   4.9, 0, '2018-11-08', true),
  ('a1100000-0000-0000-0000-000000000003', 'Sthapathi Krishnan Iyer',
   '11000000-0000-0000-0000-000000000003', 'Head Priest',
   'https://randomuser.me/api/portraits/men/65.jpg',
   4.7, 0, '2019-06-22', true);

-- ═══ ASTROLOGERS ═══════════════════════════════════════════════════════════
INSERT INTO astrologers (id, name, designation, languages, expertise, about, profile_pic, slider_images,
                         price_15min, price_30min, price_1hour, price_2hour, rating, unsettled_amount,
                         start_date, off_days, is_active) VALUES
  ('a2100000-0000-0000-0000-000000000001',
   'Gopal Dash', 'Vedic Pandit',
   ARRAY['Hindi', 'Sanskrit', 'English'],
   'Kundli Analysis, Marriage Compatibility, Career Guidance, Planetary Remedies, Muhurta',
   'Acharya Gopal Dash is a renowned Vedic astrologer with over 18 years of practice in the traditional Parashari system. Trained at Varanasi Sanskrit University, he specializes in horoscope-based remedies, gemstone recommendations, and life-path counseling. He is known for his accurate predictions and spiritual guidance that has helped thousands of devotees find clarity in relationships, career, and health.',
   'http://localhost:4005/uploads/seed/astrologers/gopal-dash/profile.jpg',
   ARRAY[
     'http://localhost:4005/uploads/seed/astrologers/gopal-dash/banner1.jpg',
     'http://localhost:4005/uploads/seed/astrologers/gopal-dash/banner2.jpg',
     'http://localhost:4005/uploads/seed/astrologers/gopal-dash/banner3.jpg'
   ],
   150, 280, 500, 950, 4.8, 0, '2019-01-10', ARRAY['SUN'], true),

  ('a2100000-0000-0000-0000-000000000002',
   'Jagat Bandhu', 'KP-System Astrologer',
   ARRAY['Hindi', 'Bengali', 'English'],
   'KP System, Horary Astrology, Nadi Reading, Business Consultancy, Financial Forecasts',
   'Shri Jagat Bandhu brings 15+ years of expertise in KP (Krishnamurti Paddhati) astrology and Nadi Jyotish. A former banker turned full-time astrologer, he uniquely blends precise mathematical astrology with intuitive Nadi-leaf readings. His consultations are sought by business owners and professionals seeking timing-based decisions for investments, launches, and career moves.',
   'http://localhost:4005/uploads/seed/astrologers/jagat-bandhu/profile.jpg',
   ARRAY[
     'http://localhost:4005/uploads/seed/astrologers/jagat-bandhu/banner1.jpg',
     'http://localhost:4005/uploads/seed/astrologers/jagat-bandhu/banner2.jpg',
     'http://localhost:4005/uploads/seed/astrologers/jagat-bandhu/banner3.jpg'
   ],
   180, 320, 600, 1100, 4.7, 0, '2021-05-18', ARRAY['MON'], true),

  ('a2100000-0000-0000-0000-000000000003',
   'Jeevan Kumar', 'Tarot & Numerology Expert',
   ARRAY['Hindi', 'English', 'Punjabi'],
   'Tarot Reading, Numerology, Past-Life Regression, Crystal Healing, Aura Cleansing',
   'Jeevan Kumar is a spiritual counselor specializing in tarot and numerology with a 12-year track record. His approach combines intuitive card reading with name-number analysis to help clients navigate personal and relationship crossroads. He conducts sessions in both Hindi and English and is known for his empathetic, non-judgmental listening style.',
   'http://localhost:4005/uploads/seed/astrologers/jeevan-kumar/profile.jpg',
   ARRAY[
     'http://localhost:4005/uploads/seed/astrologers/jeevan-kumar/banner1.jpg',
     'http://localhost:4005/uploads/seed/astrologers/jeevan-kumar/banner2.jpg',
     'http://localhost:4005/uploads/seed/astrologers/jeevan-kumar/banner3.jpg'
   ],
   120, 220, 400, 750, 4.6, 0, '2022-02-01', ARRAY['TUE'], true);

-- ═══ HAMPERS ═══════════════════════════════════════════════════════════════
INSERT INTO hampers (id, name, content_description, stock_qty) VALUES
  ('eb100000-0000-0000-0000-000000000001', 'Basic Puja Prasad Hamper',
   'Includes: deity photo card, sacred sindoor pouch, 25g panchamrit prasad, raksha sutra thread, small diya.',
   500),
  ('eb100000-0000-0000-0000-000000000002', 'Premium Puja Prasad Hamper',
   'Includes: deity photo card, silver-coated sindoor box, 100g assorted prasad, rudraksha bead, holy Ganga jal vial, printed sankalp letter, decorative diya.',
   300),
  ('eb100000-0000-0000-0000-000000000003', 'Basic Chadhava Prasad Hamper',
   'Includes: deity image, sindoor/tilak pouch, 25g prasad, sacred thread.',
   500),
  ('eb100000-0000-0000-0000-000000000004', 'Premium Chadhava Prasad Hamper',
   'Includes: framed deity image, sindoor box, 75g prasad, tulsi mala, holy ash, sacred thread, sankalp card.',
   300);

-- ═══ PUJAS ═══════════════════════════════════════════════════════════════
INSERT INTO pujas (id, name, temple_id, deity_id, default_pujari_id,
                   schedule_day, schedule_time, event_repeats, lunar_phase,
                   max_bookings_per_event, booking_mode,
                   price_for_1, price_for_2, price_for_4, price_for_6,
                   sample_video_url, slider_images, benefits, rituals_included,
                   hamper_id, send_hamper, is_active) VALUES
  ('ee100000-0000-0000-0000-000000000001',
   'Laxmi Dhandatri Puja',
   '11000000-0000-0000-0000-000000000001',
   'd1000000-0000-0000-0000-000000000004',
   'a1100000-0000-0000-0000-000000000001',
   'FRI', '07:00 AM', true, 'Purnima',
   500, 'BOTH',
   1908, 3500, 6500, 9000,
   NULL,
   ARRAY[
     'http://localhost:4005/uploads/seed/pujas/laxmi-dhandatri-puja/1.jpg',
     'http://localhost:4005/uploads/seed/pujas/laxmi-dhandatri-puja/2.jpg',
     'http://localhost:4005/uploads/seed/pujas/laxmi-dhandatri-puja/3.jpg',
     'http://localhost:4005/uploads/seed/pujas/laxmi-dhandatri-puja/4.jpg',
     'http://localhost:4005/uploads/seed/pujas/laxmi-dhandatri-puja/5.jpg',
     'http://localhost:4005/uploads/seed/pujas/laxmi-dhandatri-puja/6.jpg'
   ],
   'A sacred puja dedicated to Goddess Mahalaxmi Dhandatri, the bestower of wealth, abundance, and prosperity. Performed on auspicious Fridays and Purnima, this puja invokes the divine grace of the Goddess to remove financial obstacles, attract wealth, stabilize business ventures, and ensure the well-being of the entire family. Devotees seek blessings for a harmonious, prosperous life filled with divine abundance.',
   'Ganesh Vandana & Kalash Sthapana; Laxmi Ashtottara Shatanamavali; Shree Suktam recitation; Kanak-Dhara Stotra path; Havan with 108 oblations; Maha Aarti and Prasad distribution',
   'eb100000-0000-0000-0000-000000000002', true, true),

  ('ee100000-0000-0000-0000-000000000002',
   'Haridwar Shiv Bhuta Shanti',
   '11000000-0000-0000-0000-000000000002',
   'd1000000-0000-0000-0000-000000000001',
   'a1100000-0000-0000-0000-000000000002',
   'MON', '06:30 AM', true, 'Amavasya',
   400, 'BOTH',
   2108, 3900, 7200, 10000,
   NULL,
   ARRAY[
     'http://localhost:4005/uploads/seed/pujas/haridwar-shiv-bhuta-shanti/1.jpg',
     'http://localhost:4005/uploads/seed/pujas/haridwar-shiv-bhuta-shanti/2.jpg',
     'http://localhost:4005/uploads/seed/pujas/haridwar-shiv-bhuta-shanti/3.jpg',
     'http://localhost:4005/uploads/seed/pujas/haridwar-shiv-bhuta-shanti/4.jpg',
     'http://localhost:4005/uploads/seed/pujas/haridwar-shiv-bhuta-shanti/5.jpg',
     'http://localhost:4005/uploads/seed/pujas/haridwar-shiv-bhuta-shanti/6.jpg'
   ],
   'The Shiv Bhuta Shanti Puja performed at the sacred Kedarnath region is a powerful Vedic ritual to pacify wandering spirits, ancestral unrest, and negative energies. It restores peace within the household, shields the family from evil eye, and brings lasting spiritual protection. Particularly beneficial for those facing unexplained obstacles, chronic illness, or recurring misfortunes.',
   'Ganga Snan and Sankalp on the riverbank; Rudra Abhishek with panchamrit; Bhuta Shanti mantra chanting (108 times); Tarpan for ancestral souls; Havan with til-jau-ghee oblations; Closing Shiv Aarti',
   'eb100000-0000-0000-0000-000000000002', true, true),

  ('ee100000-0000-0000-0000-000000000003',
   'Durga Navami Upasana Puja',
   '11000000-0000-0000-0000-000000000001',
   'd1000000-0000-0000-0000-000000000005',
   'a1100000-0000-0000-0000-000000000001',
   'NAVAMI', '09:00 AM', true, 'Shukla Navami',
   600, 'ONE_TIME',
   2508, 4500, 8500, 12000,
   NULL,
   ARRAY[
     'http://localhost:4005/uploads/seed/pujas/durga-navami-upasana-puja/1.jpg',
     'http://localhost:4005/uploads/seed/pujas/durga-navami-upasana-puja/2.jpg',
     'http://localhost:4005/uploads/seed/pujas/durga-navami-upasana-puja/3.jpg',
     'http://localhost:4005/uploads/seed/pujas/durga-navami-upasana-puja/4.jpg',
     'http://localhost:4005/uploads/seed/pujas/durga-navami-upasana-puja/5.jpg',
     'http://localhost:4005/uploads/seed/pujas/durga-navami-upasana-puja/6.jpg'
   ],
   'Performed on the auspicious Navami Tithi of Chaitra and Ashwin Navratri, the Durga Navami Upasana Puja invokes the nine divine forms of Goddess Durga. This potent puja bestows courage, destroys enemies (inner and outer), removes long-standing obstacles, and grants victory in endeavors. Ideal for students, entrepreneurs, and anyone seeking divine strength.',
   'Kalash Sthapana with nine grains; Durga Saptashati recital (full Chandi Path); Kumkum & Kanya Puja; Hawan with 108 oblations; Nav-Chandi Yagya; Maha Aarti and sindoor archana',
   'eb100000-0000-0000-0000-000000000002', true, true);

-- ═══ CHADHAVAS ═══════════════════════════════════════════════════════════
INSERT INTO chadhavas (id, name, temple_id, schedule_day, schedule_time,
                       max_bookings_per_event, booking_mode,
                       sample_video_url, slider_images, benefits, rituals_included,
                       hamper_id, send_hamper, is_active) VALUES
  ('cc100000-0000-0000-0000-000000000001',
   'Kali Mangala Arti Dana',
   '11000000-0000-0000-0000-000000000001',
   'TUE,SAT', '06:00 AM',
   300, 'BOTH',
   NULL,
   ARRAY[
     'http://localhost:4005/uploads/seed/chadhavas/kali-mangala-arti-dana/1.jpg',
     'http://localhost:4005/uploads/seed/chadhavas/kali-mangala-arti-dana/2.jpg',
     'http://localhost:4005/uploads/seed/chadhavas/kali-mangala-arti-dana/3.jpg',
     'http://localhost:4005/uploads/seed/chadhavas/kali-mangala-arti-dana/4.jpg',
     'http://localhost:4005/uploads/seed/chadhavas/kali-mangala-arti-dana/5.jpg',
     'http://localhost:4005/uploads/seed/chadhavas/kali-mangala-arti-dana/6.jpg'
   ],
   'A powerful offering to Maa Dakshin Kali on her most revered days — Tuesdays and Saturdays. The Mangala Arti Dana Chadhava invokes Her fierce protective grace to destroy enemies, dispel negative entities, and grant unwavering courage. Particularly beneficial during times of legal disputes, business rivalry, or unexplained misfortunes.',
   'Kali Stuti and Dhyan; Red hibiscus flower garland offering; 108 Kali Beej Mantra Jap; Mustard-oil diya offering; Sindoor archana; Dakshin Kali Aarti',
   'eb100000-0000-0000-0000-000000000004', true, true),

  ('cc100000-0000-0000-0000-000000000002',
   'Bhairav Dana Seva',
   '11000000-0000-0000-0000-000000000002',
   'SAT', '07:00 AM',
   250, 'ONE_TIME',
   NULL,
   ARRAY[
     'http://localhost:4005/uploads/seed/chadhavas/bhairav-dana-seva/1.jpg',
     'http://localhost:4005/uploads/seed/chadhavas/bhairav-dana-seva/2.jpg',
     'http://localhost:4005/uploads/seed/chadhavas/bhairav-dana-seva/3.jpg',
     'http://localhost:4005/uploads/seed/chadhavas/bhairav-dana-seva/4.jpg',
     'http://localhost:4005/uploads/seed/chadhavas/bhairav-dana-seva/5.jpg',
     'http://localhost:4005/uploads/seed/chadhavas/bhairav-dana-seva/6.jpg'
   ],
   'Seva to Bhairavnath — the fierce guardian of Kashi and divine protector of devotees. This Dana Seva Chadhava grants immunity from fears, protection from enemies and hostile forces, success in legal matters, and removal of Rahu-Ketu doshas. Ideal for those facing court cases, career stagnation, or chronic anxiety.',
   'Kaal Bhairav Dhyan; Black sesame and mustard oil offering; Bhairav Chalisa path (7 times); Offering of jaggery-laddu; Dakshina Bhairav Aarti',
   'eb100000-0000-0000-0000-000000000004', true, true),

  ('cc100000-0000-0000-0000-000000000003',
   'Shani Shanti Bheta Dana',
   '11000000-0000-0000-0000-000000000003',
   'SAT', '05:30 PM',
   400, 'BOTH',
   NULL,
   ARRAY[
     'http://localhost:4005/uploads/seed/chadhavas/shani-shanti-bheta-dana/1.jpg',
     'http://localhost:4005/uploads/seed/chadhavas/shani-shanti-bheta-dana/2.jpg',
     'http://localhost:4005/uploads/seed/chadhavas/shani-shanti-bheta-dana/3.jpg',
     'http://localhost:4005/uploads/seed/chadhavas/shani-shanti-bheta-dana/4.jpg',
     'http://localhost:4005/uploads/seed/chadhavas/shani-shanti-bheta-dana/5.jpg',
     'http://localhost:4005/uploads/seed/chadhavas/shani-shanti-bheta-dana/6.jpg'
   ],
   'A Saturday evening offering dedicated to Shani Dev, the karmic planetary lord. This Bheta Dana Chadhava is especially effective for those under Sade Sati, Dhaiya, or facing the effects of an unfavorable Shani in their kundli. Brings relief from obstacles in career, delays in marriage, financial crunch, and health issues.',
   'Shani Stotra recital; Black sesame and iron nail offering; Mustard oil and dhuni; Gareeb-dana daan (symbolic charity); Shani Chalisa; Shani Aarti',
   'eb100000-0000-0000-0000-000000000004', true, true);

-- ═══ CHADHAVA OFFERINGS (line items per chadhava) ════════════════════════════
INSERT INTO chadhava_offerings (id, chadhava_id, item_name, benefit, price, images, sort_order) VALUES
  ('cd100000-0000-0000-0000-000000000001', 'cc100000-0000-0000-0000-000000000001', 'Hibiscus Garland',      'Pleases Maa Kali, invokes protective grace',      101, ARRAY['http://localhost:4005/uploads/seed/chadhavas/kali-mangala-arti-dana/2.jpg'], 1),
  ('cd100000-0000-0000-0000-000000000002', 'cc100000-0000-0000-0000-000000000001', '108 Kali Nam Jap',       'Blesses with unwavering courage',                 2001, ARRAY['http://localhost:4005/uploads/seed/chadhavas/kali-mangala-arti-dana/3.jpg'], 2),
  ('cd100000-0000-0000-0000-000000000003', 'cc100000-0000-0000-0000-000000000001', 'Mustard-oil Diya',       'Destroys negative entities',                       51, ARRAY['http://localhost:4005/uploads/seed/chadhavas/kali-mangala-arti-dana/4.jpg'], 3),
  ('cd100000-0000-0000-0000-000000000004', 'cc100000-0000-0000-0000-000000000001', 'Sindoor Archana',        'Bestows marital harmony',                         151, ARRAY['http://localhost:4005/uploads/seed/chadhavas/kali-mangala-arti-dana/5.jpg'], 4),
  ('cd100000-0000-0000-0000-000000000005', 'cc100000-0000-0000-0000-000000000001', 'Red Rose Archana',       'Attracts divine feminine blessings',               61, ARRAY['http://localhost:4005/uploads/seed/chadhavas/kali-mangala-arti-dana/6.jpg'], 5),

  ('cd100000-0000-0000-0000-000000000006', 'cc100000-0000-0000-0000-000000000002', 'Jaggery Laddu Prasad',   'Sweet offering beloved by Bhairav Dev',            61, ARRAY['http://localhost:4005/uploads/seed/chadhavas/bhairav-dana-seva/2.jpg'], 1),
  ('cd100000-0000-0000-0000-000000000007', 'cc100000-0000-0000-0000-000000000002', 'Black Sesame Dana',      'Removes Rahu-Ketu doshas',                        101, ARRAY['http://localhost:4005/uploads/seed/chadhavas/bhairav-dana-seva/3.jpg'], 2),
  ('cd100000-0000-0000-0000-000000000008', 'cc100000-0000-0000-0000-000000000002', 'Mustard Oil Diya',       'Shields from negative energies',                   51, ARRAY['http://localhost:4005/uploads/seed/chadhavas/bhairav-dana-seva/4.jpg'], 3),
  ('cd100000-0000-0000-0000-000000000009', 'cc100000-0000-0000-0000-000000000002', 'Bhairav Chalisa Path',   'Protection in legal and professional matters',    251, ARRAY['http://localhost:4005/uploads/seed/chadhavas/bhairav-dana-seva/5.jpg'], 4),
  ('cd100000-0000-0000-0000-000000000010', 'cc100000-0000-0000-0000-000000000002', 'Dog Food Dana',          'Symbolic offering to Bhairav''s vahana',          151, ARRAY['http://localhost:4005/uploads/seed/chadhavas/bhairav-dana-seva/6.jpg'], 5),

  ('cd100000-0000-0000-0000-000000000011', 'cc100000-0000-0000-0000-000000000003', 'Iron Nail + Black Cloth','Absorbs Shani''s negative energy',                 71, ARRAY['http://localhost:4005/uploads/seed/chadhavas/shani-shanti-bheta-dana/2.jpg'], 1),
  ('cd100000-0000-0000-0000-000000000012', 'cc100000-0000-0000-0000-000000000003', 'Black Sesame Dana',      'Pacifies Shani''s malefic effects',               101, ARRAY['http://localhost:4005/uploads/seed/chadhavas/shani-shanti-bheta-dana/3.jpg'], 2),
  ('cd100000-0000-0000-0000-000000000013', 'cc100000-0000-0000-0000-000000000003', 'Mustard Oil Offering',   'Traditional Shani abhishek',                      151, ARRAY['http://localhost:4005/uploads/seed/chadhavas/shani-shanti-bheta-dana/4.jpg'], 3),
  ('cd100000-0000-0000-0000-000000000014', 'cc100000-0000-0000-0000-000000000003', 'Shani Chalisa Path',     'Brings relief from Sade Sati',                    201, ARRAY['http://localhost:4005/uploads/seed/chadhavas/shani-shanti-bheta-dana/5.jpg'], 4),
  ('cd100000-0000-0000-0000-000000000015', 'cc100000-0000-0000-0000-000000000003', 'Gareeb Daan',            'Symbolic charity for karmic relief',              501, ARRAY['http://localhost:4005/uploads/seed/chadhavas/shani-shanti-bheta-dana/6.jpg'], 5);

-- ═══ DEVOTEES ═══════════════════════════════════════════════════════════
INSERT INTO devotees (id, name, phone, gotra, image_url, level, gems) VALUES
  ('de100000-0000-0000-0000-000000000001', 'Smita Bhardwaj', '9455567776', 'Bharadwaj', 'https://randomuser.me/api/portraits/women/44.jpg', 5, 100),
  ('de100000-0000-0000-0000-000000000002', 'Bishnu Kumar',   '9876543210', 'Kashyap',   'https://randomuser.me/api/portraits/men/34.jpg',   3, 45),
  ('de100000-0000-0000-0000-000000000003', 'Ram Dash',       '6555877756', 'Kashyap',   'https://randomuser.me/api/portraits/men/41.jpg',   5, 80),
  ('de100000-0000-0000-0000-000000000004', 'Shyam Dash',     '6556678889', 'Kashyap',   'https://randomuser.me/api/portraits/men/48.jpg',   4, 60),
  ('de100000-0000-0000-0000-000000000005', 'Debjani Seth',   '9876501001', 'Vashishta', 'https://randomuser.me/api/portraits/women/35.jpg', 2, 20);

-- ═══ ACHIEVEMENTS ═══════════════════════════════════════════════════════
INSERT INTO achievements (id, name, description, image_url, criteria_type, criteria_value, gems_reward) VALUES
  ('ac100000-0000-0000-0000-000000000001', 'Astro Seeker',    'Book your first astrology appointment',       'http://localhost:4005/uploads/seed/astrologers/gopal-dash/profile.jpg',           'APPOINTMENTS_BOOKED', 1,  5),
  ('ac100000-0000-0000-0000-000000000002', 'Steady One',      'Complete 5 consecutive pujas',                 'http://localhost:4005/uploads/seed/pujas/laxmi-dhandatri-puja/1.jpg',            'PUJAS_COMPLETED',     5, 15),
  ('ac100000-0000-0000-0000-000000000003', 'Devotee',         'Complete 10 pujas across temples',             'http://localhost:4005/uploads/seed/pujas/durga-navami-upasana-puja/1.jpg',       'PUJAS_COMPLETED',    10, 25),
  ('ac100000-0000-0000-0000-000000000004', 'Shakti Bhakt',    'Book 3 Devi pujas (Kali, Durga, Laxmi)',        'http://localhost:4005/uploads/seed/chadhavas/kali-mangala-arti-dana/1.jpg',     'PUJAS_BOOKED',        3, 10),
  ('ac100000-0000-0000-0000-000000000005', 'Temple Explorer', 'Visit pages of 5 different temples',            'http://localhost:4005/uploads/seed/temples/kedarnath-temple/1.jpg',              'TEMPLES_VIEWED',      5,  8);

INSERT INTO devotee_achievements (devotee_id, achievement_id) VALUES
  ('de100000-0000-0000-0000-000000000001', 'ac100000-0000-0000-0000-000000000001'),
  ('de100000-0000-0000-0000-000000000001', 'ac100000-0000-0000-0000-000000000002'),
  ('de100000-0000-0000-0000-000000000001', 'ac100000-0000-0000-0000-000000000004');

-- ═══ PUJA EVENTS ═══════════════════════════════════════════════════════
INSERT INTO puja_events (id, puja_id, pujari_id, start_time, max_bookings, status, stage) VALUES
  ('fe100000-0000-0000-0000-000000000001', 'ee100000-0000-0000-0000-000000000001', 'a1100000-0000-0000-0000-000000000001', NOW() + INTERVAL '2 days', 500, 'NOT_STARTED', 'YET_TO_START'),
  ('fe100000-0000-0000-0000-000000000002', 'ee100000-0000-0000-0000-000000000002', 'a1100000-0000-0000-0000-000000000002', NOW() + INTERVAL '3 days', 400, 'NOT_STARTED', 'YET_TO_START'),
  ('fe100000-0000-0000-0000-000000000003', 'ee100000-0000-0000-0000-000000000003', 'a1100000-0000-0000-0000-000000000001', NOW() + INTERVAL '7 days', 600, 'NOT_STARTED', 'YET_TO_START'),
  ('fe100000-0000-0000-0000-000000000004', 'ee100000-0000-0000-0000-000000000001', 'a1100000-0000-0000-0000-000000000001', NOW() - INTERVAL '1 day',  500, 'INPROGRESS',  'LIVE_ADDED'),
  ('fe100000-0000-0000-0000-000000000005', 'ee100000-0000-0000-0000-000000000002', 'a1100000-0000-0000-0000-000000000002', NOW() - INTERVAL '5 days', 400, 'COMPLETED',   'SHIPPED');

-- ═══ PUJA BOOKINGS ═══════════════════════════════════════════════════════
INSERT INTO puja_bookings (id, puja_event_id, devotee_id, devotee_count, cost, sankalp, prasad_delivery_address, status, payment_status, booking_type) VALUES
  ('fb100000-0000-0000-0000-000000000001', 'fe100000-0000-0000-0000-000000000005', 'de100000-0000-0000-0000-000000000002', 2, 3500, 'For wealth, health and happiness of my family',         '123 MG Road, Varanasi, UP 221001',       'COMPLETED',   'PAID', 'ONE_TIME'),
  ('fb100000-0000-0000-0000-000000000002', 'fe100000-0000-0000-0000-000000000001', 'de100000-0000-0000-0000-000000000002', 2, 3500, 'For financial stability and business growth',           '123 MG Road, Varanasi, UP 221001',       'NOT_STARTED', 'PAID', 'SUBSCRIPTION'),
  ('fb100000-0000-0000-0000-000000000003', 'fe100000-0000-0000-0000-000000000004', 'de100000-0000-0000-0000-000000000001', 4, 6500, 'For ancestral peace and family protection',             '456 Nehru Nagar, Ahmedabad, GJ 380001',  'INPROGRESS',  'PAID', 'ONE_TIME'),
  ('fb100000-0000-0000-0000-000000000004', 'fe100000-0000-0000-0000-000000000001', 'de100000-0000-0000-0000-000000000001', 1, 1908, 'For divine blessings and inner peace',                  '456 Nehru Nagar, Ahmedabad, GJ 380001',  'NOT_STARTED', 'PAID', 'ONE_TIME'),
  ('fb100000-0000-0000-0000-000000000005', 'fe100000-0000-0000-0000-000000000003', 'de100000-0000-0000-0000-000000000003', 6, 12000, 'For destroying obstacles in my career path',           '789 Station Road, Lucknow, UP 226001',   'NOT_STARTED', 'PAID', 'ONE_TIME');

INSERT INTO puja_booking_devotees (puja_booking_id, name, relation, gotra) VALUES
  ('fb100000-0000-0000-0000-000000000001', 'Bishnu Kumar',   'Self',    'Kashyap'),
  ('fb100000-0000-0000-0000-000000000001', 'Anjali Kumar',   'Wife',    'Kashyap'),
  ('fb100000-0000-0000-0000-000000000002', 'Bishnu Kumar',   'Self',    'Kashyap'),
  ('fb100000-0000-0000-0000-000000000002', 'Anjali Kumar',   'Wife',    'Kashyap'),
  ('fb100000-0000-0000-0000-000000000003', 'Smita Bhardwaj', 'Self',    'Bharadwaj'),
  ('fb100000-0000-0000-0000-000000000003', 'Rajesh Bhardwaj','Father',  'Bharadwaj'),
  ('fb100000-0000-0000-0000-000000000003', 'Meena Bhardwaj', 'Mother',  'Bharadwaj'),
  ('fb100000-0000-0000-0000-000000000003', 'Amit Bhardwaj',  'Brother', 'Bharadwaj'),
  ('fb100000-0000-0000-0000-000000000004', 'Smita Bhardwaj', 'Self',    'Bharadwaj'),
  ('fb100000-0000-0000-0000-000000000005', 'Ram Dash',       'Self',    'Kashyap'),
  ('fb100000-0000-0000-0000-000000000005', 'Sita Dash',      'Wife',    'Kashyap'),
  ('fb100000-0000-0000-0000-000000000005', 'Laxman Dash',    'Brother', 'Kashyap'),
  ('fb100000-0000-0000-0000-000000000005', 'Urmila Dash',    'Sister-in-law', 'Kashyap'),
  ('fb100000-0000-0000-0000-000000000005', 'Bharat Dash',    'Brother', 'Kashyap'),
  ('fb100000-0000-0000-0000-000000000005', 'Shatrughan Dash','Brother', 'Kashyap');

-- ═══ CHADHAVA EVENTS ═══════════════════════════════════════════════════
INSERT INTO chadhava_events (id, chadhava_id, pujari_id, start_time, max_bookings, status, stage) VALUES
  ('ce100000-0000-0000-0000-000000000001', 'cc100000-0000-0000-0000-000000000001', 'a1100000-0000-0000-0000-000000000001', NOW() + INTERVAL '1 day',  300, 'NOT_STARTED', 'YET_TO_START'),
  ('ce100000-0000-0000-0000-000000000002', 'cc100000-0000-0000-0000-000000000002', 'a1100000-0000-0000-0000-000000000002', NOW() + INTERVAL '3 days', 250, 'NOT_STARTED', 'YET_TO_START'),
  ('ce100000-0000-0000-0000-000000000003', 'cc100000-0000-0000-0000-000000000003', 'a1100000-0000-0000-0000-000000000003', NOW() + INTERVAL '5 days', 400, 'NOT_STARTED', 'YET_TO_START'),
  ('ce100000-0000-0000-0000-000000000004', 'cc100000-0000-0000-0000-000000000001', 'a1100000-0000-0000-0000-000000000001', NOW() - INTERVAL '1 day',  300, 'INPROGRESS',  'LIVE_ADDED'),
  ('ce100000-0000-0000-0000-000000000005', 'cc100000-0000-0000-0000-000000000002', 'a1100000-0000-0000-0000-000000000002', NOW() - INTERVAL '3 days', 250, 'COMPLETED',   'SHIPPED');

INSERT INTO chadhava_bookings (id, chadhava_event_id, devotee_id, cost, sankalp, prasad_delivery_address, status, payment_status) VALUES
  ('cb100000-0000-0000-0000-000000000001', 'ce100000-0000-0000-0000-000000000005', 'de100000-0000-0000-0000-000000000001',  463, 'For divine protection and courage',              '456 Nehru Nagar, Ahmedabad, GJ 380001', 'COMPLETED',   'PAID'),
  ('cb100000-0000-0000-0000-000000000002', 'ce100000-0000-0000-0000-000000000001', 'de100000-0000-0000-0000-000000000002',  313, 'To destroy obstacles in business',               '123 MG Road, Varanasi, UP 221001',      'NOT_STARTED', 'PAID'),
  ('cb100000-0000-0000-0000-000000000003', 'ce100000-0000-0000-0000-000000000004', 'de100000-0000-0000-0000-000000000003',  212, 'For Shakti Maa''s blessings',                     '789 Station Road, Lucknow, UP 226001',  'INPROGRESS',  'PAID'),
  ('cb100000-0000-0000-0000-000000000004', 'ce100000-0000-0000-0000-000000000002', 'de100000-0000-0000-0000-000000000004',  463, 'Freedom from legal troubles',                    'C-12 Sector 15, Noida, UP 201301',      'NOT_STARTED', 'PAID'),
  ('cb100000-0000-0000-0000-000000000005', 'ce100000-0000-0000-0000-000000000003', 'de100000-0000-0000-0000-000000000005',  674, 'For relief from Shani''s Sade Sati effects',      '10 Park Street, Kolkata, WB 700016',    'NOT_STARTED', 'PAID');

INSERT INTO chadhava_booking_devotees (chadhava_booking_id, name, gotra) VALUES
  ('cb100000-0000-0000-0000-000000000001', 'Smita Bhardwaj', 'Bharadwaj'),
  ('cb100000-0000-0000-0000-000000000002', 'Bishnu Kumar',   'Kashyap'),
  ('cb100000-0000-0000-0000-000000000003', 'Ram Dash',       'Kashyap'),
  ('cb100000-0000-0000-0000-000000000003', 'Sita Dash',      'Kashyap'),
  ('cb100000-0000-0000-0000-000000000004', 'Shyam Dash',     'Kashyap'),
  ('cb100000-0000-0000-0000-000000000005', 'Debjani Seth',   'Vashishta');

INSERT INTO chadhava_booking_offerings (chadhava_booking_id, offering_id, quantity, unit_price, devotee_name) VALUES
  -- Smita (cb001) — Kali Mangala: Hibiscus + Mustard Diya + Red Rose
  ('cb100000-0000-0000-0000-000000000001', 'cd100000-0000-0000-0000-000000000001', 1, 101, 'Smita Bhardwaj'),
  ('cb100000-0000-0000-0000-000000000001', 'cd100000-0000-0000-0000-000000000003', 2,  51, 'Smita Bhardwaj'),
  ('cb100000-0000-0000-0000-000000000001', 'cd100000-0000-0000-0000-000000000005', 1,  61, 'Smita Bhardwaj'),
  -- Bishnu (cb002) — Kali Mangala: Sindoor + Hibiscus + Mustard Diya
  ('cb100000-0000-0000-0000-000000000002', 'cd100000-0000-0000-0000-000000000001', 1, 101, 'Bishnu Kumar'),
  ('cb100000-0000-0000-0000-000000000002', 'cd100000-0000-0000-0000-000000000004', 1, 151, 'Bishnu Kumar'),
  ('cb100000-0000-0000-0000-000000000002', 'cd100000-0000-0000-0000-000000000003', 1,  51, 'Bishnu Kumar'),
  -- Ram (cb003) — Kali Mangala: Hibiscus + mustard
  ('cb100000-0000-0000-0000-000000000003', 'cd100000-0000-0000-0000-000000000001', 1, 101, 'Ram Dash'),
  ('cb100000-0000-0000-0000-000000000003', 'cd100000-0000-0000-0000-000000000003', 1,  51, 'Ram Dash'),
  ('cb100000-0000-0000-0000-000000000003', 'cd100000-0000-0000-0000-000000000005', 1,  61, 'Sita Dash'),
  -- Shyam (cb004) — Bhairav: Jaggery + Black Sesame + Mustard Diya + Chalisa
  ('cb100000-0000-0000-0000-000000000004', 'cd100000-0000-0000-0000-000000000006', 1,  61, 'Shyam Dash'),
  ('cb100000-0000-0000-0000-000000000004', 'cd100000-0000-0000-0000-000000000007', 1, 101, 'Shyam Dash'),
  ('cb100000-0000-0000-0000-000000000004', 'cd100000-0000-0000-0000-000000000008', 1,  51, 'Shyam Dash'),
  ('cb100000-0000-0000-0000-000000000004', 'cd100000-0000-0000-0000-000000000009', 1, 251, 'Shyam Dash'),
  -- Debjani (cb005) — Shani: Iron Nail + Black Sesame + Mustard + Chalisa + Daan
  ('cb100000-0000-0000-0000-000000000005', 'cd100000-0000-0000-0000-000000000011', 1,  71, 'Debjani Seth'),
  ('cb100000-0000-0000-0000-000000000005', 'cd100000-0000-0000-0000-000000000012', 1, 101, 'Debjani Seth'),
  ('cb100000-0000-0000-0000-000000000005', 'cd100000-0000-0000-0000-000000000013', 1, 151, 'Debjani Seth'),
  ('cb100000-0000-0000-0000-000000000005', 'cd100000-0000-0000-0000-000000000014', 1, 201, 'Debjani Seth'),
  ('cb100000-0000-0000-0000-000000000005', 'cd100000-0000-0000-0000-000000000015', 1, 501, 'Debjani Seth');

-- ═══ APPOINTMENTS ═══════════════════════════════════════════════════════
INSERT INTO appointments (id, astrologer_id, devotee_id, duration, scheduled_at, cost, status, meet_link, devotee_name, devotee_gotra) VALUES
  ('ab100000-0000-0000-0000-000000000001', 'a2100000-0000-0000-0000-000000000001', 'de100000-0000-0000-0000-000000000001', '30min', NOW() + INTERVAL '2 hours',  280, 'INPROGRESS',               'https://meet.google.com/abc-defg-hij', 'Smita Bhardwaj', 'Bharadwaj'),
  ('ab100000-0000-0000-0000-000000000002', 'a2100000-0000-0000-0000-000000000001', 'de100000-0000-0000-0000-000000000002', '30min', NOW() + INTERVAL '1 day',    280, 'LINK_YET_TO_BE_GENERATED', NULL,                                   'Bishnu Kumar',   'Kashyap'),
  ('ab100000-0000-0000-0000-000000000003', 'a2100000-0000-0000-0000-000000000002', 'de100000-0000-0000-0000-000000000001', '1hour', NOW() - INTERVAL '3 days',   600, 'COMPLETED',                'https://meet.google.com/xyz-abcd-efg', 'Smita Bhardwaj', 'Bharadwaj'),
  ('ab100000-0000-0000-0000-000000000004', 'a2100000-0000-0000-0000-000000000002', 'de100000-0000-0000-0000-000000000003', '15min', NOW() - INTERVAL '1 day',    180, 'CANCELLED',                NULL,                                   'Ram Dash',       'Kashyap'),
  ('ab100000-0000-0000-0000-000000000005', 'a2100000-0000-0000-0000-000000000003', 'de100000-0000-0000-0000-000000000005', '30min', NOW() + INTERVAL '3 days',   220, 'LINK_YET_TO_BE_GENERATED', NULL,                                   'Debjani Seth',   'Vashishta'),
  ('ab100000-0000-0000-0000-000000000006', 'a2100000-0000-0000-0000-000000000003', 'de100000-0000-0000-0000-000000000002', '1hour', NOW() + INTERVAL '4 hours',  400, 'INPROGRESS',               'https://meet.google.com/pqr-stuv-wxy', 'Bishnu Kumar',   'Kashyap'),
  ('ab100000-0000-0000-0000-000000000007', 'a2100000-0000-0000-0000-000000000001', 'de100000-0000-0000-0000-000000000004', '2hour', NOW() + INTERVAL '2 days',   950, 'LINK_YET_TO_BE_GENERATED', NULL,                                   'Shyam Dash',     'Kashyap'),
  ('ab100000-0000-0000-0000-000000000008', 'a2100000-0000-0000-0000-000000000002', 'de100000-0000-0000-0000-000000000003', '2hour', NOW() + INTERVAL '6 hours', 1100, 'INPROGRESS',               'https://meet.google.com/mno-lkji-hgf', 'Ram Dash',       'Kashyap');

-- ═══ PAYMENTS ═══════════════════════════════════════════════════════════
INSERT INTO payments (id, booking_type, booking_id, devotee_id, amount, status, gateway_order_id) VALUES
  ('ba100000-0000-0000-0000-000000000001', 'PUJA',        'fb100000-0000-0000-0000-000000000001', 'de100000-0000-0000-0000-000000000002', 3500, 'CAPTURED', 'order_seed_001'),
  ('ba100000-0000-0000-0000-000000000002', 'PUJA',        'fb100000-0000-0000-0000-000000000002', 'de100000-0000-0000-0000-000000000002', 3500, 'CAPTURED', 'order_seed_002'),
  ('ba100000-0000-0000-0000-000000000003', 'PUJA',        'fb100000-0000-0000-0000-000000000003', 'de100000-0000-0000-0000-000000000001', 6500, 'CAPTURED', 'order_seed_003'),
  ('ba100000-0000-0000-0000-000000000004', 'PUJA',        'fb100000-0000-0000-0000-000000000004', 'de100000-0000-0000-0000-000000000001', 1908, 'CAPTURED', 'order_seed_004'),
  ('ba100000-0000-0000-0000-000000000005', 'PUJA',        'fb100000-0000-0000-0000-000000000005', 'de100000-0000-0000-0000-000000000003',12000, 'CAPTURED', 'order_seed_005'),
  ('ba100000-0000-0000-0000-000000000006', 'CHADHAVA',    'cb100000-0000-0000-0000-000000000001', 'de100000-0000-0000-0000-000000000001',  463, 'CAPTURED', 'order_seed_006'),
  ('ba100000-0000-0000-0000-000000000007', 'CHADHAVA',    'cb100000-0000-0000-0000-000000000002', 'de100000-0000-0000-0000-000000000002',  313, 'CAPTURED', 'order_seed_007'),
  ('ba100000-0000-0000-0000-000000000008', 'CHADHAVA',    'cb100000-0000-0000-0000-000000000003', 'de100000-0000-0000-0000-000000000003',  212, 'CAPTURED', 'order_seed_008'),
  ('ba100000-0000-0000-0000-000000000009', 'CHADHAVA',    'cb100000-0000-0000-0000-000000000004', 'de100000-0000-0000-0000-000000000004',  463, 'CAPTURED', 'order_seed_009'),
  ('ba100000-0000-0000-0000-000000000010', 'CHADHAVA',    'cb100000-0000-0000-0000-000000000005', 'de100000-0000-0000-0000-000000000005',  674, 'CAPTURED', 'order_seed_010'),
  ('ba100000-0000-0000-0000-000000000011', 'APPOINTMENT', 'ab100000-0000-0000-0000-000000000001', 'de100000-0000-0000-0000-000000000001',  280, 'CAPTURED', 'order_seed_011'),
  ('ba100000-0000-0000-0000-000000000012', 'APPOINTMENT', 'ab100000-0000-0000-0000-000000000002', 'de100000-0000-0000-0000-000000000002',  280, 'CAPTURED', 'order_seed_012'),
  ('ba100000-0000-0000-0000-000000000013', 'APPOINTMENT', 'ab100000-0000-0000-0000-000000000003', 'de100000-0000-0000-0000-000000000001',  600, 'CAPTURED', 'order_seed_013'),
  ('ba100000-0000-0000-0000-000000000014', 'APPOINTMENT', 'ab100000-0000-0000-0000-000000000005', 'de100000-0000-0000-0000-000000000005',  220, 'CAPTURED', 'order_seed_014'),
  ('ba100000-0000-0000-0000-000000000015', 'APPOINTMENT', 'ab100000-0000-0000-0000-000000000006', 'de100000-0000-0000-0000-000000000002',  400, 'CAPTURED', 'order_seed_015'),
  ('ba100000-0000-0000-0000-000000000016', 'APPOINTMENT', 'ab100000-0000-0000-0000-000000000007', 'de100000-0000-0000-0000-000000000004',  950, 'CAPTURED', 'order_seed_016'),
  ('ba100000-0000-0000-0000-000000000017', 'APPOINTMENT', 'ab100000-0000-0000-0000-000000000008', 'de100000-0000-0000-0000-000000000003', 1100, 'CAPTURED', 'order_seed_017');

-- ═══ LEDGER ═══════════════════════════════════════════════════════════
INSERT INTO ledger_entries (party_type, party_id, event_type, event_id, fee, settled) VALUES
  ('PUJARI',     'a1100000-0000-0000-0000-000000000001', 'PUJA',        'fe100000-0000-0000-0000-000000000001', 600, false),
  ('PUJARI',     'a1100000-0000-0000-0000-000000000002', 'PUJA',        'fe100000-0000-0000-0000-000000000002', 700, false),
  ('PUJARI',     'a1100000-0000-0000-0000-000000000001', 'PUJA',        'fe100000-0000-0000-0000-000000000003', 800, false),
  ('PUJARI',     'a1100000-0000-0000-0000-000000000001', 'PUJA',        'fe100000-0000-0000-0000-000000000004', 600, false),
  ('PUJARI',     'a1100000-0000-0000-0000-000000000002', 'PUJA',        'fe100000-0000-0000-0000-000000000005', 700, true),
  ('PUJARI',     'a1100000-0000-0000-0000-000000000001', 'CHADHAVA',    'ce100000-0000-0000-0000-000000000001', 350, false),
  ('PUJARI',     'a1100000-0000-0000-0000-000000000002', 'CHADHAVA',    'ce100000-0000-0000-0000-000000000002', 400, false),
  ('PUJARI',     'a1100000-0000-0000-0000-000000000003', 'CHADHAVA',    'ce100000-0000-0000-0000-000000000003', 450, false),
  ('ASTROLOGER', 'a2100000-0000-0000-0000-000000000001', 'APPOINTMENT', 'ab100000-0000-0000-0000-000000000001', 200, false),
  ('ASTROLOGER', 'a2100000-0000-0000-0000-000000000001', 'APPOINTMENT', 'ab100000-0000-0000-0000-000000000002', 200, false),
  ('ASTROLOGER', 'a2100000-0000-0000-0000-000000000002', 'APPOINTMENT', 'ab100000-0000-0000-0000-000000000003', 420, true),
  ('ASTROLOGER', 'a2100000-0000-0000-0000-000000000003', 'APPOINTMENT', 'ab100000-0000-0000-0000-000000000005', 150, false),
  ('ASTROLOGER', 'a2100000-0000-0000-0000-000000000003', 'APPOINTMENT', 'ab100000-0000-0000-0000-000000000006', 280, false),
  ('ASTROLOGER', 'a2100000-0000-0000-0000-000000000001', 'APPOINTMENT', 'ab100000-0000-0000-0000-000000000007', 665, false),
  ('ASTROLOGER', 'a2100000-0000-0000-0000-000000000002', 'APPOINTMENT', 'ab100000-0000-0000-0000-000000000008', 770, false);

-- ═══ GEMS ═══════════════════════════════════════════════════════════════
INSERT INTO gems_transactions (devotee_id, amount, reason, reference_id) VALUES
  ('de100000-0000-0000-0000-000000000001', 10, 'PUJA_BOOKED',        'fb100000-0000-0000-0000-000000000003'),
  ('de100000-0000-0000-0000-000000000001',  5, 'APPOINTMENT_BOOKED', 'ab100000-0000-0000-0000-000000000001'),
  ('de100000-0000-0000-0000-000000000001', 15, 'ACHIEVEMENT',        'ac100000-0000-0000-0000-000000000002'),
  ('de100000-0000-0000-0000-000000000001',  5, 'ACHIEVEMENT',        'ac100000-0000-0000-0000-000000000001'),
  ('de100000-0000-0000-0000-000000000001', 10, 'ACHIEVEMENT',        'ac100000-0000-0000-0000-000000000004'),
  ('de100000-0000-0000-0000-000000000002', 10, 'PUJA_BOOKED',        'fb100000-0000-0000-0000-000000000001'),
  ('de100000-0000-0000-0000-000000000002', 10, 'PUJA_BOOKED',        'fb100000-0000-0000-0000-000000000002'),
  ('de100000-0000-0000-0000-000000000003', 10, 'PUJA_BOOKED',        'fb100000-0000-0000-0000-000000000005'),
  ('de100000-0000-0000-0000-000000000004',  5, 'CHADHAVA_BOOKED',    'cb100000-0000-0000-0000-000000000004'),
  ('de100000-0000-0000-0000-000000000005',  5, 'CHADHAVA_BOOKED',    'cb100000-0000-0000-0000-000000000005');

-- ═══ APP SETTINGS ═══════════════════════════════════════════════════════
UPDATE app_settings SET
  whatsapp_support_number = '919455567776',
  call_support_number     = '918234567890',
  home_puja_slider_ids    = ARRAY[
    'ee100000-0000-0000-0000-000000000001'::uuid,
    'ee100000-0000-0000-0000-000000000003'::uuid,
    'ee100000-0000-0000-0000-000000000002'::uuid
  ],
  updated_at = NOW()
WHERE id = 1;
