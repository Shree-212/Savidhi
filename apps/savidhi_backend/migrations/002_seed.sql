-- ═══════════════════════════════════════════════════════════════════════════
-- SEED DATA FOR SAVIDHI PLATFORM
-- ═══════════════════════════════════════════════════════════════════════════

-- Clean existing seed data (keep admin user created via API)
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
  ('d1000000-0000-0000-0000-000000000001', 'Lord Shiva', 'https://images.unsplash.com/photo-1609766857326-18dba7ceed50?w=200'),
  ('d1000000-0000-0000-0000-000000000002', 'Lord Vishnu', 'https://images.unsplash.com/photo-1609766857326-18dba7ceed50?w=200'),
  ('d1000000-0000-0000-0000-000000000003', 'Hanuman', 'https://images.unsplash.com/photo-1609766857326-18dba7ceed50?w=200'),
  ('d1000000-0000-0000-0000-000000000004', 'Goddess Laxmi', 'https://images.unsplash.com/photo-1609766857326-18dba7ceed50?w=200'),
  ('d1000000-0000-0000-0000-000000000005', 'Shree Rama', 'https://images.unsplash.com/photo-1609766857326-18dba7ceed50?w=200'),
  ('d1000000-0000-0000-0000-000000000006', 'Lord Shani', 'https://images.unsplash.com/photo-1609766857326-18dba7ceed50?w=200'),
  ('d1000000-0000-0000-0000-000000000007', 'Radha Krishna', 'https://images.unsplash.com/photo-1609766857326-18dba7ceed50?w=200'),
  ('d1000000-0000-0000-0000-000000000008', 'Narshimha', 'https://images.unsplash.com/photo-1609766857326-18dba7ceed50?w=200'),
  ('d1000000-0000-0000-0000-000000000009', 'Goddess Kali', 'https://images.unsplash.com/photo-1609766857326-18dba7ceed50?w=200'),
  ('d1000000-0000-0000-0000-000000000010', 'Goddess Devi', 'https://images.unsplash.com/photo-1609766857326-18dba7ceed50?w=200');

-- ═══ TEMPLES ═══════════════════════════════════════════════════════════════
INSERT INTO temples (id, name, address, pincode, google_map_link, about, history_and_significance, sample_video_url, slider_images) VALUES
  ('t1000000-0000-0000-0000-000000000001', 'Ram Adevi Temple', 'Devi Pitha, UP', '221001', 'https://maps.google.com/?q=devi+pitha', 'Ancient temple dedicated to Goddess Devi in the sacred Devi Pitha region.', 'One of the 51 Shakti Peethas mentioned in ancient scriptures.', 'https://www.youtube.com/watch?v=example1', '{"https://images.unsplash.com/photo-1548013146-72479768bada?w=800","https://images.unsplash.com/photo-1564804955013-e02010e40006?w=800"}'),
  ('t1000000-0000-0000-0000-000000000002', 'Gupteswar Temple', 'Haridwar, UP', '249401', 'https://maps.google.com/?q=gupteswar+haridwar', 'Sacred cave temple dedicated to Lord Shiva in Haridwar.', 'The temple houses a natural Shiva Lingam inside a cave near the Ganges.', 'https://www.youtube.com/watch?v=example2', '{"https://images.unsplash.com/photo-1591018653367-5a1389201670?w=800"}'),
  ('t1000000-0000-0000-0000-000000000003', 'Kashi Viswanath Temple', 'Varanasi, UP', '221001', 'https://maps.google.com/?q=kashi+vishwanath', 'One of the most famous Hindu temples dedicated to Lord Shiva, located in Varanasi.', 'The temple has been referred to in Hindu scriptures for a very long time as a central part of worship in the Shaiva philosophy.', 'https://www.youtube.com/watch?v=example3', '{"https://images.unsplash.com/photo-1561361058-c24cecae35ca?w=800","https://images.unsplash.com/photo-1609766857326-18dba7ceed50?w=800"}'),
  ('t1000000-0000-0000-0000-000000000004', 'Chandi Parth Temple', 'Haridwar, UP', '249401', 'https://maps.google.com/?q=chandi+devi+haridwar', 'Temple dedicated to Goddess Chandi atop Neel Parvat in Haridwar.', 'Built by King Suchat Singh in 1929, the temple is one of Haridwar''s Panch Tirth.', NULL, '{"https://images.unsplash.com/photo-1591018653367-5a1389201670?w=800"}'),
  ('t1000000-0000-0000-0000-000000000005', 'Vindyavashini Temple', 'Mirzapur, UP', '231001', 'https://maps.google.com/?q=vindhyavasini', 'Ancient temple of Goddess Vindhyavasini in Vindhyachal.', 'One of the most important Shakti Peethas in India.', NULL, '{"https://images.unsplash.com/photo-1548013146-72479768bada?w=800"}');

-- ═══ TEMPLE-DEITIES ═══════════════════════════════════════════════════════
INSERT INTO temple_deities (temple_id, deity_id) VALUES
  ('t1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000010'),
  ('t1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000004'),
  ('t1000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000001'),
  ('t1000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000001'),
  ('t1000000-0000-0000-0000-000000000004', 'd1000000-0000-0000-0000-000000000009'),
  ('t1000000-0000-0000-0000-000000000005', 'd1000000-0000-0000-0000-000000000010');

-- ═══ PUJARIS ═══════════════════════════════════════════════════════════════
INSERT INTO pujaris (id, name, phone, designation, temple_id, profile_pic, rating, fee_per_puja) VALUES
  ('pj100000-0000-0000-0000-000000000001', 'Gopal Dash', '9876543001', 'Head Priest', 't1000000-0000-0000-0000-000000000003', 'https://randomuser.me/api/portraits/men/32.jpg', 4.5, 500),
  ('pj100000-0000-0000-0000-000000000002', 'Raman Dash', '9876543002', 'Senior Priest', 't1000000-0000-0000-0000-000000000001', 'https://randomuser.me/api/portraits/men/45.jpg', 4.2, 400),
  ('pj100000-0000-0000-0000-000000000003', 'Laxman Das', '9876543003', 'Priest', 't1000000-0000-0000-0000-000000000001', 'https://randomuser.me/api/portraits/men/55.jpg', 4.0, 350),
  ('pj100000-0000-0000-0000-000000000004', 'Suresh Sharma', '9876543004', 'Head Priest', 't1000000-0000-0000-0000-000000000002', 'https://randomuser.me/api/portraits/men/60.jpg', 4.8, 600),
  ('pj100000-0000-0000-0000-000000000005', 'Sanjay Dixit', '9876543005', 'Senior Priest', 't1000000-0000-0000-0000-000000000004', 'https://randomuser.me/api/portraits/men/33.jpg', 4.1, 450);

-- ═══ ASTROLOGERS ═══════════════════════════════════════════════════════════
INSERT INTO astrologers (id, name, phone, designation, profile_pic, rating, experience_years, languages, expertise, about, price_15min, price_30min, price_1hour, price_2hour, off_days) VALUES
  ('as100000-0000-0000-0000-000000000001', 'Gopal Dash', '9876544001', 'Vedic Pandeet', 'https://randomuser.me/api/portraits/men/32.jpg', 4.5, 10, '{"Hindi","Gujarati","English"}', '{"Kundli Analysis","Vedic Astrology","Marriage Compatibility"}', 'Expert Vedic astrologer with deep knowledge of ancient scriptures and planetary positions.', 150, 280, 500, 950, '{}'),
  ('as100000-0000-0000-0000-000000000002', 'Jagat Bandhu', '9876544002', 'Vedic Astrologer', 'https://randomuser.me/api/portraits/men/44.jpg', 4.3, 10, '{"Hindi","Bengali","English"}', '{"Horoscope Reading","Gemstone Recommendation","Career Guidance"}', 'Experienced Vedic astrologer specializing in career and relationship guidance.', 150, 280, 500, 950, '{}'),
  ('as100000-0000-0000-0000-000000000003', 'Jeevan Kumar', '9876544003', 'Tarot Reader', 'https://randomuser.me/api/portraits/men/52.jpg', 4.7, 10, '{"Hindi","English"}', '{"Tarot Reading","Numerology","Past Life Regression"}', 'Gifted tarot reader and numerologist providing spiritual guidance.', 150, 280, 500, 950, '{}'),
  ('as100000-0000-0000-0000-000000000004', 'Ram Sada Siv', '9876544004', 'Vedic Pandeet', 'https://randomuser.me/api/portraits/men/62.jpg', 4.9, 15, '{"Hindi","Sanskrit","English"}', '{"Muhurta","Vasthu Shastra","Prashna Kundli"}', 'Senior Vedic scholar with 15 years of experience in Muhurta and Vasthu consultation.', 200, 380, 700, 1300, '{}'),
  ('as100000-0000-0000-0000-000000000005', 'Hrishikesh Mishra', '9876544005', 'Vedic Astrologer', 'https://randomuser.me/api/portraits/men/72.jpg', 4.6, 12, '{"Hindi","English","Marathi"}', '{"Kundli Analysis","Mangal Dosh","Kaal Sarp Dosh"}', 'Specialist in doshas and remedial astrology.', 180, 340, 600, 1100, '{}');

-- ═══ HAMPERS ═══════════════════════════════════════════════════════════════
INSERT INTO hampers (id, name, description, contents, stock_qty) VALUES
  ('hm100000-0000-0000-0000-000000000001', 'Basic Puja Hamper', 'Essential items for puja blessings', '{"Photo","Sindoor","Prasad","Thread"}', 200),
  ('hm100000-0000-0000-0000-000000000002', 'Premium Puja Hamper', 'Complete puja blessings package', '{"Photo","Sindoor","Prasad","Thread","Rudraksha","Holy Water"}', 200),
  ('hm100000-0000-0000-0000-000000000003', 'Basic Chadhava Hamper', 'Essential chadhava items', '{"Photo","Sindoor","Prasad","Thread"}', 200),
  ('hm100000-0000-0000-0000-000000000004', 'Premium Chadhava Hamper', 'Complete chadhava blessings package', '{"Photo","Sindoor","Prasad","Thread","Holy Ash","Sacred Tulsi"}', 200);

-- ═══ PUJAS ═══════════════════════════════════════════════════════════════
INSERT INTO pujas (id, name, temple_id, deity_id, description, benefits, rituals_included, how_to_do, price_for_1, price_for_2, price_for_5, schedule_day, schedule_time, hamper_id, slider_images, video_url, max_bookings) VALUES
  ('pu100000-0000-0000-0000-000000000001', 'Laxmi Dhandatri Puja', 't1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000004', 'Sacred puja for wealth and prosperity blessings from Goddess Laxmi.', '{"Wealth and prosperity","Business growth","Financial stability","Family well-being"}', '{"Ganesh Puja","Kalash Sthapana","Laxmi Vandana","Havan","Aarti"}', '{"Select the puja and choose date","Enter devotee names and gotra","Complete payment","Watch live stream on puja day","Receive prasad at home"}', 1908, 3500, 8000, 'MON,THU', '07:00 AM', 'hm100000-0000-0000-0000-000000000001', '{"https://images.unsplash.com/photo-1548013146-72479768bada?w=800"}', NULL, 200),
  ('pu100000-0000-0000-0000-000000000002', 'Haridwar Shiv Bhuta Shanti', 't1000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000001', 'Powerful Shiva puja for peace from negative energies and ancestral blessings.', '{"Freedom from negative energies","Ancestral peace","Mental clarity","Spiritual protection"}', '{"Shiva Puja","Bhuta Shanti Havan","Rudra Abhishek","Tarpan","Aarti"}', '{"Select the puja and choose date","Enter devotee names and gotra","Complete payment","Watch live stream on puja day","Receive prasad at home"}', 1908, 3500, 8000, 'MON,THU', '07:00 AM', 'hm100000-0000-0000-0000-000000000001', '{"https://images.unsplash.com/photo-1591018653367-5a1389201670?w=800"}', NULL, 200),
  ('pu100000-0000-0000-0000-000000000003', 'Devi Puja', 't1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000010', 'Weekly Devi puja for divine blessings and protection.', '{"Divine protection","Family harmony","Health improvement","Success in endeavors"}', '{"Devi Vandana","Durga Saptashati","Havan","Kumkum Archana","Aarti"}', '{"Select the puja and choose date","Enter devotee names and gotra","Complete payment","Watch live stream on puja day","Receive prasad at home"}', 2508, 4500, 10000, 'TUE,FRI', '09:00 AM', 'hm100000-0000-0000-0000-000000000002', '{"https://images.unsplash.com/photo-1564804955013-e02010e40006?w=800"}', NULL, 200),
  ('pu100000-0000-0000-0000-000000000004', 'Kashi Viswanath Bhuta Sudhi', 't1000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000001', 'Most powerful Bhuta Sudhi puja at the sacred Kashi Viswanath Temple.', '{"Complete spiritual purification","Moksha blessings","Ancestral liberation","Cosmic protection"}', '{"Shiva Abhishek","Bhuta Sudhi Mantra","Rudrabhishek","Maha Havan","Ganga Aarti"}', '{"Select the puja and choose date","Enter devotee names and gotra","Complete payment","Watch live stream on puja day","Receive prasad at home"}', 3108, 5500, 13000, 'SAT', '02:00 PM', 'hm100000-0000-0000-0000-000000000002', '{"https://images.unsplash.com/photo-1561361058-c24cecae35ca?w=800","https://images.unsplash.com/photo-1609766857326-18dba7ceed50?w=800"}', NULL, 200);

-- ═══ CHADHAVAS ═══════════════════════════════════════════════════════════
INSERT INTO chadhavas (id, name, temple_id, deity_id, description, benefits, rituals_included, how_to_offer, schedule_day, schedule_time, hamper_id, slider_images, video_url) VALUES
  ('ch100000-0000-0000-0000-000000000001', 'Kali Mangala Arti Dana', 't1000000-0000-0000-0000-000000000004', 'd1000000-0000-0000-0000-000000000009', 'Weekly offerings to Goddess Kali for protection and blessings.', '{"Divine protection from evil","Courage and strength","Removal of obstacles","Spiritual advancement"}', '{"Kali Vandana","Mangal Aarti","Dana Offering","Pushpanjali","Prarthana"}', '{"Select chadhava and choose offerings","Enter devotee names and gotra","Complete payment","Watch live stream on offering day","Receive prasad at home"}', 'TUE,SAT', '06:00 AM', 'hm100000-0000-0000-0000-000000000003', '{"https://images.unsplash.com/photo-1591018653367-5a1389201670?w=800"}', NULL),
  ('ch100000-0000-0000-0000-000000000002', 'Bhairav Dana Seva', 't1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 'Sacred offering to Lord Bhairav for removing fears and obstacles.', '{"Freedom from fears","Protection from enemies","Success in legal matters","Spiritual growth"}', '{"Bhairav Puja","Dana Offering","Sarso Tel Deepak","Aarti","Prarthana"}', '{"Select chadhava and choose offerings","Enter devotee names and gotra","Complete payment","Watch live stream on offering day","Receive prasad at home"}', 'SAT', '07:00 AM', 'hm100000-0000-0000-0000-000000000003', '{"https://images.unsplash.com/photo-1548013146-72479768bada?w=800"}', NULL);

-- ═══ CHADHAVA OFFERINGS ═══════════════════════════════════════════════════
INSERT INTO chadhava_offerings (id, chadhava_id, item_name, price) VALUES
  ('co100000-0000-0000-0000-000000000001', 'ch100000-0000-0000-0000-000000000001', 'Laddu',            61),
  ('co100000-0000-0000-0000-000000000002', 'ch100000-0000-0000-0000-000000000001', '1008 Nam Jap',   2001),
  ('co100000-0000-0000-0000-000000000003', 'ch100000-0000-0000-0000-000000000001', 'Hibiscus Garland', 101),
  ('co100000-0000-0000-0000-000000000004', 'ch100000-0000-0000-0000-000000000002', 'Flowers',          51),
  ('co100000-0000-0000-0000-000000000005', 'ch100000-0000-0000-0000-000000000002', 'Coconut',         101);

-- ═══ DEVOTEES ═══════════════════════════════════════════════════════════
INSERT INTO devotees (id, name, phone, gotra, level, gems, image_url) VALUES
  ('dv100000-0000-0000-0000-000000000001', 'Smita Bhardwaj', '9455567776', 'Bharadwaj', 5, 100, 'https://randomuser.me/api/portraits/women/44.jpg'),
  ('dv100000-0000-0000-0000-000000000002', 'Bishnu Kumar', '9876543210', 'Kashyap', 3, 45, 'https://randomuser.me/api/portraits/men/34.jpg'),
  ('dv100000-0000-0000-0000-000000000003', 'Ram Dash', '6555877756', 'Kashyap', 5, 80, 'https://randomuser.me/api/portraits/men/41.jpg'),
  ('dv100000-0000-0000-0000-000000000004', 'Shyam Dash', '6556678889', 'Kashyap', 4, 60, 'https://randomuser.me/api/portraits/men/48.jpg'),
  ('dv100000-0000-0000-0000-000000000005', 'Debjani Seth', '9876501001', 'Vashishta', 2, 20, 'https://randomuser.me/api/portraits/women/35.jpg');

-- ═══ ACHIEVEMENTS ═══════════════════════════════════════════════════════
INSERT INTO achievements (id, name, description, image_url, criteria_type, criteria_value, gems_reward) VALUES
  ('ac100000-0000-0000-0000-000000000001', 'Astro Seeker', 'Book your first astrology appointment', 'https://images.unsplash.com/photo-1609766857326-18dba7ceed50?w=100', 'APPOINTMENTS_BOOKED', 1, 5),
  ('ac100000-0000-0000-0000-000000000002', 'Steady One', 'Complete 5 consecutive pujas', 'https://images.unsplash.com/photo-1548013146-72479768bada?w=100', 'PUJAS_COMPLETED', 5, 15),
  ('ac100000-0000-0000-0000-000000000003', 'Devotee', 'Complete 10 pujas across temples', 'https://images.unsplash.com/photo-1564804955013-e02010e40006?w=100', 'PUJAS_COMPLETED', 10, 25);

-- Give Smita first two achievements
INSERT INTO devotee_achievements (devotee_id, achievement_id) VALUES
  ('dv100000-0000-0000-0000-000000000001', 'ac100000-0000-0000-0000-000000000001'),
  ('dv100000-0000-0000-0000-000000000001', 'ac100000-0000-0000-0000-000000000002');

-- ═══ PUJA EVENTS ═══════════════════════════════════════════════════════
INSERT INTO puja_events (id, puja_id, pujari_id, start_time, status, stage) VALUES
  ('pe100000-0000-0000-0000-000000000001', 'pu100000-0000-0000-0000-000000000001', 'pj100000-0000-0000-0000-000000000002', NOW() + INTERVAL '2 days', 'NOT_STARTED', 'YET_TO_START'),
  ('pe100000-0000-0000-0000-000000000002', 'pu100000-0000-0000-0000-000000000002', 'pj100000-0000-0000-0000-000000000004', NOW() + INTERVAL '2 days', 'NOT_STARTED', 'YET_TO_START'),
  ('pe100000-0000-0000-0000-000000000003', 'pu100000-0000-0000-0000-000000000003', 'pj100000-0000-0000-0000-000000000002', NOW() + INTERVAL '5 days', 'NOT_STARTED', 'YET_TO_START'),
  ('pe100000-0000-0000-0000-000000000004', 'pu100000-0000-0000-0000-000000000004', 'pj100000-0000-0000-0000-000000000001', NOW() - INTERVAL '1 day', 'INPROGRESS', 'LIVE_ADDED'),
  ('pe100000-0000-0000-0000-000000000005', 'pu100000-0000-0000-0000-000000000001', 'pj100000-0000-0000-0000-000000000003', NOW() - INTERVAL '5 days', 'COMPLETED', 'SHIPPED');

-- ═══ PUJA BOOKINGS ═══════════════════════════════════════════════════════
INSERT INTO puja_bookings (id, puja_event_id, devotee_id, devotee_count, sankalp, prasad_delivery_address, cost, status, payment_status) VALUES
  ('pb100000-0000-0000-0000-000000000001', 'pe100000-0000-0000-0000-000000000005', 'dv100000-0000-0000-0000-000000000002', 2, 'For the well-being and prosperity of the family', '123 MG Road, Varanasi, UP 221001', 2000, 'COMPLETED', 'PAID'),
  ('pb100000-0000-0000-0000-000000000002', 'pe100000-0000-0000-0000-000000000001', 'dv100000-0000-0000-0000-000000000002', 2, 'For health and happiness', '123 MG Road, Varanasi, UP 221001', 2000, 'NOT_STARTED', 'PAID'),
  ('pb100000-0000-0000-0000-000000000003', 'pe100000-0000-0000-0000-000000000004', 'dv100000-0000-0000-0000-000000000002', 2, 'For spiritual growth', '123 MG Road, Varanasi, UP 221001', 2000, 'INPROGRESS', 'PAID'),
  ('pb100000-0000-0000-0000-000000000004', 'pe100000-0000-0000-0000-000000000001', 'dv100000-0000-0000-0000-000000000001', 1, 'For peace and blessings', '456 Nehru Nagar, Ahmedabad, GJ 380001', 1908, 'NOT_STARTED', 'PAID'),
  ('pb100000-0000-0000-0000-000000000005', 'pe100000-0000-0000-0000-000000000003', 'dv100000-0000-0000-0000-000000000003', 1, 'Devi blessings for family', '789 Station Road, Lucknow, UP 226001', 2508, 'NOT_STARTED', 'PAID');

-- ═══ PUJA BOOKING DEVOTEES ═══════════════════════════════════════════════
INSERT INTO puja_booking_devotees (puja_booking_id, name, relation, gotra) VALUES
  ('pb100000-0000-0000-0000-000000000001', 'Rama Prasad',    'Father',  'Kashyap'),
  ('pb100000-0000-0000-0000-000000000001', 'Shyam Prasad',   'Brother', 'Kashyap'),
  ('pb100000-0000-0000-0000-000000000002', 'Rama Prasad',    'Father',  'Kashyap'),
  ('pb100000-0000-0000-0000-000000000002', 'Shyam Prasad',   'Brother', 'Kashyap'),
  ('pb100000-0000-0000-0000-000000000003', 'Rama Prasad',    'Father',  'Kashyap'),
  ('pb100000-0000-0000-0000-000000000003', 'Shyam Prasad',   'Brother', 'Kashyap'),
  ('pb100000-0000-0000-0000-000000000004', 'Smita Bhardwaj', 'Self',    'Bharadwaj'),
  ('pb100000-0000-0000-0000-000000000005', 'Ram Dash',       'Self',    'Kashyap');

-- ═══ CHADHAVA EVENTS ═══════════════════════════════════════════════════
INSERT INTO chadhava_events (id, chadhava_id, pujari_id, start_time, status, stage) VALUES
  ('ce100000-0000-0000-0000-000000000001', 'ch100000-0000-0000-0000-000000000001', 'pj100000-0000-0000-0000-000000000005', NOW() + INTERVAL '1 day',  'NOT_STARTED', 'YET_TO_START'),
  ('ce100000-0000-0000-0000-000000000002', 'ch100000-0000-0000-0000-000000000002', 'pj100000-0000-0000-0000-000000000002', NOW() + INTERVAL '3 days', 'NOT_STARTED', 'YET_TO_START'),
  ('ce100000-0000-0000-0000-000000000003', 'ch100000-0000-0000-0000-000000000001', 'pj100000-0000-0000-0000-000000000005', NOW() - INTERVAL '2 days', 'COMPLETED',   'SHIPPED'),
  ('ce100000-0000-0000-0000-000000000004', 'ch100000-0000-0000-0000-000000000002', 'pj100000-0000-0000-0000-000000000001', NOW() + INTERVAL '2 days', 'INPROGRESS',  'LIVE_ADDED'),
  ('ce100000-0000-0000-0000-000000000005', 'ch100000-0000-0000-0000-000000000001', 'pj100000-0000-0000-0000-000000000005', NOW() + INTERVAL '5 days', 'NOT_STARTED', 'YET_TO_START'),
  ('ce100000-0000-0000-0000-000000000006', 'ch100000-0000-0000-0000-000000000002', 'pj100000-0000-0000-0000-000000000002', NOW() - INTERVAL '1 day',  'INPROGRESS',  'SANKALP_VIDEO_ADDED');

-- ═══ CHADHAVA BOOKINGS ═══════════════════════════════════════════════════
INSERT INTO chadhava_bookings (id, chadhava_event_id, devotee_id, sankalp, prasad_delivery_address, cost, status, payment_status) VALUES
  ('cb100000-0000-0000-0000-000000000001', 'ce100000-0000-0000-0000-000000000001', 'dv100000-0000-0000-0000-000000000002', 'For family blessings and prosperity', '123 MG Road, Varanasi, UP 221001', 2163, 'NOT_STARTED', 'PAID'),
  ('cb100000-0000-0000-0000-000000000002', 'ce100000-0000-0000-0000-000000000003', 'dv100000-0000-0000-0000-000000000001', 'Protection and divine blessings', '456 Nehru Nagar, Ahmedabad, GJ 380001', 162, 'COMPLETED', 'PAID'),
  ('cb100000-0000-0000-0000-000000000003', 'ce100000-0000-0000-0000-000000000001', 'dv100000-0000-0000-0000-000000000003', 'For good health and happiness', '789 Station Road, Lucknow, UP 226001', 162, 'NOT_STARTED', 'PAID'),
  ('cb100000-0000-0000-0000-000000000004', 'ce100000-0000-0000-0000-000000000002', 'dv100000-0000-0000-0000-000000000004', 'For success in business ventures', 'C-12 Sector 15, Noida, UP 201301', 51, 'NOT_STARTED', 'PAID'),
  ('cb100000-0000-0000-0000-000000000005', 'ce100000-0000-0000-0000-000000000004', 'dv100000-0000-0000-0000-000000000002', 'Overcome obstacles, Bhairav blessings', '123 MG Road, Varanasi, UP 221001', 152, 'INPROGRESS', 'PAID'),
  ('cb100000-0000-0000-0000-000000000006', 'ce100000-0000-0000-0000-000000000006', 'dv100000-0000-0000-0000-000000000005', 'For courage and spiritual growth', '10 Park Street, Kolkata, WB 700016', 152, 'INPROGRESS', 'PAID');

-- Chadhava booking devotees
INSERT INTO chadhava_booking_devotees (chadhava_booking_id, name, gotra) VALUES
  ('cb100000-0000-0000-0000-000000000001', 'Bishnu Kumar',   'Kashyap'),
  ('cb100000-0000-0000-0000-000000000001', 'Shyam Kumar',    'Kashyap'),
  ('cb100000-0000-0000-0000-000000000002', 'Smita Bhardwaj', 'Bharadwaj'),
  ('cb100000-0000-0000-0000-000000000003', 'Ram Dash',       'Kashyap'),
  ('cb100000-0000-0000-0000-000000000004', 'Shyam Dash',     'Kashyap'),
  ('cb100000-0000-0000-0000-000000000005', 'Bishnu Kumar',   'Kashyap'),
  ('cb100000-0000-0000-0000-000000000006', 'Debjani Seth',   'Vashishta');

-- Chadhava booking offerings
INSERT INTO chadhava_booking_offerings (chadhava_booking_id, offering_id, quantity, unit_price) VALUES
  ('cb100000-0000-0000-0000-000000000001', 'co100000-0000-0000-0000-000000000001', 2, 61),
  ('cb100000-0000-0000-0000-000000000001', 'co100000-0000-0000-0000-000000000002', 1, 2001),
  ('cb100000-0000-0000-0000-000000000001', 'co100000-0000-0000-0000-000000000003', 1, 101),
  ('cb100000-0000-0000-0000-000000000002', 'co100000-0000-0000-0000-000000000001', 1, 61),
  ('cb100000-0000-0000-0000-000000000002', 'co100000-0000-0000-0000-000000000003', 1, 101),
  ('cb100000-0000-0000-0000-000000000003', 'co100000-0000-0000-0000-000000000001', 1, 61),
  ('cb100000-0000-0000-0000-000000000003', 'co100000-0000-0000-0000-000000000003', 1, 101),
  ('cb100000-0000-0000-0000-000000000004', 'co100000-0000-0000-0000-000000000004', 1, 51),
  ('cb100000-0000-0000-0000-000000000005', 'co100000-0000-0000-0000-000000000004', 1, 51),
  ('cb100000-0000-0000-0000-000000000005', 'co100000-0000-0000-0000-000000000005', 1, 101),
  ('cb100000-0000-0000-0000-000000000006', 'co100000-0000-0000-0000-000000000004', 1, 51),
  ('cb100000-0000-0000-0000-000000000006', 'co100000-0000-0000-0000-000000000005', 1, 101);

-- ═══ APPOINTMENTS ═══════════════════════════════════════════════════════
INSERT INTO appointments (id, astrologer_id, devotee_id, duration, scheduled_at, cost, status, meet_link, devotee_name, devotee_gotra) VALUES
  ('ap100000-0000-0000-0000-000000000001', 'as100000-0000-0000-0000-000000000004', 'dv100000-0000-0000-0000-000000000001', '30min',  NOW() + INTERVAL '2 hours',  280, 'INPROGRESS',               'https://meet.google.com/abc-defg-hij', 'Smita Bhardwaj', 'Bharadwaj'),
  ('ap100000-0000-0000-0000-000000000002', 'as100000-0000-0000-0000-000000000001', 'dv100000-0000-0000-0000-000000000001', '30min',  NOW() + INTERVAL '1 day',    280, 'LINK_YET_TO_BE_GENERATED', NULL,                                   'Smita Bhardwaj', 'Bharadwaj'),
  ('ap100000-0000-0000-0000-000000000003', 'as100000-0000-0000-0000-000000000004', 'dv100000-0000-0000-0000-000000000001', '1hour',  NOW() - INTERVAL '3 days',   500, 'COMPLETED',                'https://meet.google.com/xyz-abcd-efg', 'Smita Bhardwaj', 'Bharadwaj'),
  ('ap100000-0000-0000-0000-000000000004', 'as100000-0000-0000-0000-000000000004', 'dv100000-0000-0000-0000-000000000003', '15min',  NOW() - INTERVAL '1 day',    200, 'CANCELLED',                NULL,                                   'Ram Dash',       'Kashyap'),
  ('ap100000-0000-0000-0000-000000000005', 'as100000-0000-0000-0000-000000000002', 'dv100000-0000-0000-0000-000000000005', '30min',  NOW() + INTERVAL '3 days',   280, 'LINK_YET_TO_BE_GENERATED', NULL,                                   'Debjani Seth',   'Vashishta'),
  ('ap100000-0000-0000-0000-000000000006', 'as100000-0000-0000-0000-000000000003', 'dv100000-0000-0000-0000-000000000002', '1hour',  NOW() + INTERVAL '4 hours',  500, 'INPROGRESS',               'https://meet.google.com/pqr-stuv-wxy', 'Bishnu Kumar',   'Kashyap'),
  ('ap100000-0000-0000-0000-000000000007', 'as100000-0000-0000-0000-000000000005', 'dv100000-0000-0000-0000-000000000004', '30min',  NOW() + INTERVAL '2 days',   340, 'LINK_YET_TO_BE_GENERATED', NULL,                                   'Shyam Dash',     'Kashyap'),
  ('ap100000-0000-0000-0000-000000000008', 'as100000-0000-0000-0000-000000000001', 'dv100000-0000-0000-0000-000000000003', '2hour',  NOW() + INTERVAL '6 hours',  950, 'INPROGRESS',               'https://meet.google.com/mno-lkji-hgf', 'Ram Dash',       'Kashyap'),
  ('ap100000-0000-0000-0000-000000000009', 'as100000-0000-0000-0000-000000000002', 'dv100000-0000-0000-0000-000000000001', '15min',  NOW() - INTERVAL '5 days',   150, 'COMPLETED',                'https://meet.google.com/zzz-yyy-xxx', 'Smita Bhardwaj', 'Bharadwaj'),
  ('ap100000-0000-0000-0000-000000000010', 'as100000-0000-0000-0000-000000000004', 'dv100000-0000-0000-0000-000000000005', '30min',  NOW() + INTERVAL '5 days',   280, 'LINK_YET_TO_BE_GENERATED', NULL,                                   'Debjani Seth',   'Vashishta');

-- ═══ PAYMENTS ═══════════════════════════════════════════════════════════
INSERT INTO payments (id, booking_type, booking_id, amount, status, gateway_order_id) VALUES
  ('py100000-0000-0000-0000-000000000001', 'PUJA',        'pb100000-0000-0000-0000-000000000001', 2000, 'CAPTURED', 'order_test001'),
  ('py100000-0000-0000-0000-000000000002', 'PUJA',        'pb100000-0000-0000-0000-000000000002', 2000, 'CAPTURED', 'order_test002'),
  ('py100000-0000-0000-0000-000000000003', 'PUJA',        'pb100000-0000-0000-0000-000000000003', 2000, 'CAPTURED', 'order_test003'),
  ('py100000-0000-0000-0000-000000000004', 'PUJA',        'pb100000-0000-0000-0000-000000000004', 1908, 'CAPTURED', 'order_test004'),
  ('py100000-0000-0000-0000-000000000005', 'PUJA',        'pb100000-0000-0000-0000-000000000005', 2508, 'CAPTURED', 'order_test005'),
  ('py100000-0000-0000-0000-000000000006', 'CHADHAVA',    'cb100000-0000-0000-0000-000000000001', 2163, 'CAPTURED', 'order_test006'),
  ('py100000-0000-0000-0000-000000000007', 'CHADHAVA',    'cb100000-0000-0000-0000-000000000002',  162, 'CAPTURED', 'order_test007'),
  ('py100000-0000-0000-0000-000000000008', 'APPOINTMENT', 'ap100000-0000-0000-0000-000000000001',  280, 'CAPTURED', 'order_test008'),
  ('py100000-0000-0000-0000-000000000009', 'APPOINTMENT', 'ap100000-0000-0000-0000-000000000002',  280, 'CAPTURED', 'order_test009'),
  ('py100000-0000-0000-0000-000000000010', 'APPOINTMENT', 'ap100000-0000-0000-0000-000000000003',  500, 'CAPTURED', 'order_test010'),
  ('py100000-0000-0000-0000-000000000011', 'CHADHAVA',    'cb100000-0000-0000-0000-000000000003',  162, 'CAPTURED', 'order_test011'),
  ('py100000-0000-0000-0000-000000000012', 'CHADHAVA',    'cb100000-0000-0000-0000-000000000004',   51, 'CAPTURED', 'order_test012'),
  ('py100000-0000-0000-0000-000000000013', 'APPOINTMENT', 'ap100000-0000-0000-0000-000000000006',  500, 'CAPTURED', 'order_test013'),
  ('py100000-0000-0000-0000-000000000014', 'APPOINTMENT', 'ap100000-0000-0000-0000-000000000007',  340, 'CAPTURED', 'order_test014'),
  ('py100000-0000-0000-0000-000000000015', 'APPOINTMENT', 'ap100000-0000-0000-0000-000000000008',  950, 'CAPTURED', 'order_test015');

-- ═══ LEDGER ENTRIES ═══════════════════════════════════════════════════════
INSERT INTO ledger_entries (party_type, party_id, event_type, event_id, fee, settled) VALUES
  ('PUJARI',     'pj100000-0000-0000-0000-000000000002', 'PUJA',        'pe100000-0000-0000-0000-000000000001',  400, false),
  ('PUJARI',     'pj100000-0000-0000-0000-000000000004', 'PUJA',        'pe100000-0000-0000-0000-000000000002',  600, false),
  ('PUJARI',     'pj100000-0000-0000-0000-000000000001', 'PUJA',        'pe100000-0000-0000-0000-000000000004',  500, false),
  ('PUJARI',     'pj100000-0000-0000-0000-000000000003', 'PUJA',        'pe100000-0000-0000-0000-000000000005',  350, true),
  ('PUJARI',     'pj100000-0000-0000-0000-000000000005', 'CHADHAVA',    'ce100000-0000-0000-0000-000000000001',  450, false),
  ('ASTROLOGER', 'as100000-0000-0000-0000-000000000004', 'APPOINTMENT', 'ap100000-0000-0000-0000-000000000001',  200, false),
  ('ASTROLOGER', 'as100000-0000-0000-0000-000000000001', 'APPOINTMENT', 'ap100000-0000-0000-0000-000000000002',  200, false),
  ('ASTROLOGER', 'as100000-0000-0000-0000-000000000004', 'APPOINTMENT', 'ap100000-0000-0000-0000-000000000003',  350, true),
  ('ASTROLOGER', 'as100000-0000-0000-0000-000000000003', 'APPOINTMENT', 'ap100000-0000-0000-0000-000000000006',  350, false),
  ('ASTROLOGER', 'as100000-0000-0000-0000-000000000005', 'APPOINTMENT', 'ap100000-0000-0000-0000-000000000007',  240, false),
  ('ASTROLOGER', 'as100000-0000-0000-0000-000000000001', 'APPOINTMENT', 'ap100000-0000-0000-0000-000000000008',  665, false);

-- ═══ GEMS TRANSACTIONS ═══════════════════════════════════════════════════
INSERT INTO gems_transactions (devotee_id, amount, reason, reference_id) VALUES
  ('dv100000-0000-0000-0000-000000000001', 10, 'Puja booked: Laxmi Dhandatri Puja', 'pb100000-0000-0000-0000-000000000004'),
  ('dv100000-0000-0000-0000-000000000001', 5, 'Appointment booked', 'ap100000-0000-0000-0000-000000000001'),
  ('dv100000-0000-0000-0000-000000000001', 15, 'Achievement unlocked: Steady One', 'ac100000-0000-0000-0000-000000000002'),
  ('dv100000-0000-0000-0000-000000000001', 5, 'Achievement unlocked: Astro Seeker', 'ac100000-0000-0000-0000-000000000001'),
  ('dv100000-0000-0000-0000-000000000002', 10, 'Puja booked', 'pb100000-0000-0000-0000-000000000001'),
  ('dv100000-0000-0000-0000-000000000002', 10, 'Puja booked', 'pb100000-0000-0000-0000-000000000002');

-- ═══ APP SETTINGS ═══════════════════════════════════════════════════════
UPDATE app_settings SET
  whatsapp_support_number = '9455567776',
  call_support_number = '8234567890',
  home_puja_slider_ids = ARRAY['pu100000-0000-0000-0000-000000000001'::uuid, 'pu100000-0000-0000-0000-000000000002'::uuid, 'pu100000-0000-0000-0000-000000000004'::uuid],
  updated_at = NOW()
WHERE id = 1;
