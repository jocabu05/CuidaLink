import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform, Animated, Dimensions, Image, Linking, TextInput } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useTheme } from '../context/ThemeContext';
import { SPACING, SHADOWS } from '../styles/theme';
interface POICategory {
    id: string;
    label: string;
    icon: string;
    emoji: string;
    color: string;
    osmTag: string;
    ionicon: keyof typeof Ionicons.glyphMap;
}

const CATEGORIES: POICategory[] = [
    { id: 'farmacia',     label: 'Farmacias',       icon: '💊', emoji: '💊', color: '#E53935', osmTag: 'amenity=pharmacy',        ionicon: 'medkit' },
    { id: 'super',        label: 'Supermercados',    icon: '🛒', emoji: '🛒', color: '#43A047', osmTag: 'shop=supermarket',        ionicon: 'cart' },
    { id: 'parque',       label: 'Parques',          icon: '🌳', emoji: '🌳', color: '#2E7D32', osmTag: 'leisure=park',            ionicon: 'leaf' },
    { id: 'salud',        label: 'Centros de Salud', icon: '🏥', emoji: '🏥', color: '#1565C0', osmTag: 'amenity=clinic|amenity=hospital|amenity=doctors', ionicon: 'fitness' },
    { id: 'cafe',         label: 'Cafeterías',       icon: '☕', emoji: '☕', color: '#6D4C41', osmTag: 'amenity=cafe',             ionicon: 'cafe' },
    { id: 'panaderia',    label: 'Panaderías',       icon: '🥖', emoji: '🥖', color: '#FF8F00', osmTag: 'shop=bakery',             ionicon: 'restaurant' },
    { id: 'restaurante',  label: 'Restaurantes',     icon: '🍽️', emoji: '🍽️', color: '#D84315', osmTag: 'amenity=restaurant',      ionicon: 'restaurant' },
    { id: 'monumento',    label: 'Monumentos',       icon: '⛪', emoji: '⛪', color: '#5E35B1', osmTag: 'historic=monument|tourism=attraction', ionicon: 'compass' },
];

interface POI {
    id: string;
    name: string;
    category: string;
    lat: number;
    lng: number;
    address?: string;
    phone?: string;
    horario?: string;
    image?: string;
    description?: string;
    googleQuery?: string;
}

const LOCAL_POIS: POI[] = [
    { id: 'f1', name: 'Farmacia Ortopedia Mateu',      category: 'farmacia', lat: 39.1525, lng: -0.4345, address: 'Av. Santos Patronos, 28', horario: 'L-V 9:00-21:00', googleQuery: 'Farmacia Ortopedia Mateu Alzira' },
    { id: 'f2', name: 'Farmacia Plaza Mayor',           category: 'farmacia', lat: 39.1500, lng: -0.4370, address: 'Plaça Major, 3', horario: 'L-S 9:00-20:30', googleQuery: 'Farmacia Plaza Mayor Alzira' },
    { id: 'f4', name: 'Farmacia Faubel',                category: 'farmacia', lat: 39.1488, lng: -0.4310, address: 'C/ Pare Castells, 6', horario: 'L-V 9:00-20:00', googleQuery: 'Farmacia Faubel Alzira' },
    { id: 's1', name: 'Mercadona Alzira Centro',    category: 'super', lat: 39.1530, lng: -0.4360, address: 'C/ Hort dels Frares, 10', horario: 'L-S 9:00-21:30', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Mercadona_Picanya.jpg/640px-Mercadona_Picanya.jpg', googleQuery: 'Mercadona Hort dels Frares Alzira' },
    { id: 's2', name: 'Consum Av. Luis Suñer',      category: 'super', lat: 39.1508, lng: -0.4300, address: 'Av. Luis Suñer, 42', horario: 'L-S 9:00-21:00', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Consum_Supermercat_Algemesi.jpg/640px-Consum_Supermercat_Algemesi.jpg', googleQuery: 'Consum Luis Suñer Alzira' },
    { id: 'h1', name: 'Centro de Salud Alzira I',       category: 'salud', lat: 39.1515, lng: -0.4340, address: 'Av. Santos Patronos, 2', phone: '962 45 83 00', horario: 'L-V 8:00-21:00', googleQuery: 'Centro Salud Alzira' },
    { id: 'h3', name: 'Centro de Especialidades',       category: 'salud', lat: 39.1495, lng: -0.4330, address: 'C/ dels Germans Maristes', phone: '962 45 83 50', googleQuery: 'Centro Especialidades Alzira' },
    { id: 'c1', name: 'Café de la Plaça',          category: 'cafe', lat: 39.1502, lng: -0.4365, address: 'Plaça Major, 8', horario: 'L-D 7:30-21:00', googleQuery: 'Cafe Plaça Major Alzira' },
    { id: 'c2', name: 'Bar Restaurante El Portalón', category: 'cafe', lat: 39.1518, lng: -0.4348, address: 'C/ Sant Roc, 12', horario: 'L-S 8:00-23:00', googleQuery: 'Bar Portalon Alzira' },
    { id: 'c3', name: 'Heladería La Jijonenca',    category: 'cafe', lat: 39.1505, lng: -0.4325, address: 'Av. Santos Patronos, 18', horario: 'L-D 10:00-22:00', googleQuery: 'Heladeria Jijonenca Alzira' },
    { id: 'c4', name: 'Café Kentia',               category: 'cafe', lat: 39.1535, lng: -0.4355, address: 'C/ Hort dels Frares, 2', horario: 'L-V 8:00-20:00', googleQuery: 'Cafe Kentia Alzira' },
    { id: 'b1', name: 'Forn de Pa El Campanar',    category: 'panaderia', lat: 39.1498, lng: -0.4340, address: 'C/ Major de Sant Agustí, 5', horario: 'L-S 6:30-14:00, 17:00-20:30', googleQuery: 'Forn Pa Campanar Alzira' },
    { id: 'b2', name: 'Panadería Artesanal Alzira', category: 'panaderia', lat: 39.1522, lng: -0.4310, address: 'C/ Pere Morell, 22', horario: 'L-S 7:00-14:00', googleQuery: 'Panaderia Artesanal Alzira' },
    { id: 'r1', name: 'Restaurante Casa Patiño',   category: 'restaurante', lat: 39.1505, lng: -0.4350, address: 'C/ Sant Roc, 5', horario: 'L-S 13:00-16:00, 20:00-23:00', phone: '962 41 12 34', googleQuery: 'Restaurante Casa Patiño Alzira' },
    { id: 'r3', name: 'Pizzería Da Mario',         category: 'restaurante', lat: 39.1532, lng: -0.4328, address: 'Av. Santos Patronos, 35', horario: 'L-D 12:00-23:30', googleQuery: 'Pizzeria Da Mario Alzira' },
    { id: 'r6', name: 'Bar Tapas El Mercat',        category: 'restaurante', lat: 39.1497, lng: -0.4360, address: 'Plaça del Mercat, 4', horario: 'L-S 11:00-23:30', googleQuery: 'Bar Tapas Mercat Alzira' },
    { id: 'm1', name: 'Iglesia de Santa Catalina',     category: 'monumento', lat: 39.1498, lng: -0.4365, address: 'Plaça Major, s/n', description: 'Iglesia gótica del siglo XIII, patrimonio histórico', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/Alzira._Iglesia_de_Santa_Catalina_2.jpg/440px-Alzira._Iglesia_de_Santa_Catalina_2.jpg', googleQuery: 'Iglesia Santa Catalina Alzira' },
    { id: 'm2', name: 'Ayuntamiento de Alzira',        category: 'monumento', lat: 39.1502, lng: -0.4368, address: 'Plaça Major, 1', description: 'Edificio histórico con fachada neoclásica', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Ajuntament_d%27Alzira_-_2.jpg/440px-Ajuntament_d%27Alzira_-_2.jpg', googleQuery: 'Ayuntamiento Alzira' },
    { id: 'm3', name: 'Muralla Árabe',                  category: 'monumento', lat: 39.1485, lng: -0.4355, address: 'C/ la Vila', description: 'Restos de la muralla medieval árabe de Alzira', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/Alzira._Muralla_1.jpg/440px-Alzira._Muralla_1.jpg', googleQuery: 'Muralla Arabe Alzira' },
    { id: 'm5', name: 'Casa de la Cultura',             category: 'monumento', lat: 39.1510, lng: -0.4372, address: 'C/ Pare Castells, 12', description: 'Centro cultural en edificio restaurado del s.XVIII', googleQuery: 'Casa Cultura Alzira' },
    { id: 'f5', name: 'Farmacia García Berlanga',       category: 'farmacia', lat: 39.1460, lng: -0.4388, address: 'C/ la Vila, 22', horario: 'L-V 9:00-20:30', googleQuery: 'Farmacia Garcia Berlanga Alzira' },
    { id: 's5', name: 'Mercadona La Vila',           category: 'super', lat: 39.1455, lng: -0.4370, address: 'C/ la Vila, 35', horario: 'L-S 9:00-21:30', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Mercadona_Picanya.jpg/640px-Mercadona_Picanya.jpg', googleQuery: 'Mercadona la Vila Alzira' },
    { id: 'h4', name: 'Consultorio La Vila',            category: 'salud', lat: 39.1462, lng: -0.4375, address: 'C/ la Vila, 45', phone: '962 41 02 10', horario: 'L-V 8:00-15:00', googleQuery: 'Consultorio Vila Alzira' },
    { id: 'c6', name: 'Café La Terreta',           category: 'cafe', lat: 39.1470, lng: -0.4345, address: 'C/ Major de Sant Agustí, 20', horario: 'L-S 7:00-20:00', googleQuery: 'Cafe la Terreta Alzira' },
    { id: 'b4', name: 'Forn de Pa La Vila',        category: 'panaderia', lat: 39.1458, lng: -0.4360, address: 'C/ la Vila, 15', horario: 'L-S 7:00-14:00, 17:00-20:00', googleQuery: 'Forn Pa Vila Alzira' },
    { id: 'r4', name: 'Asador El Rincón',          category: 'restaurante', lat: 39.1478, lng: -0.4380, address: 'C/ Major de Sant Agustí, 30', horario: 'M-D 13:00-16:00, 20:30-23:00', googleQuery: 'Asador Rincon Alzira' },
    { id: 'v_f1', name: 'Farmacia La Vila Sur',    category: 'farmacia', lat: 39.1435, lng: -0.4395, address: 'C/ la Vila, 65', horario: 'L-V 9:00-20:00', googleQuery: 'Farmacia la Vila Alzira' },
    { id: 'v_c1', name: 'Bar La Vila',             category: 'cafe', lat: 39.1445, lng: -0.4383, address: 'C/ la Vila, 50', horario: 'L-D 7:00-22:00', googleQuery: 'Bar la Vila Alzira' },
    { id: 'v_r1', name: 'Restaurante El Portalet', category: 'restaurante', lat: 39.1442, lng: -0.4370, address: 'C/ la Vila, 58', horario: 'L-S 13:00-16:00, 20:00-23:00', googleQuery: 'Restaurante Portalet Alzira' },
    { id: 'v_b1', name: 'Forn Sant Agustí',        category: 'panaderia', lat: 39.1448, lng: -0.4355, address: 'C/ Major de Sant Agustí, 45', horario: 'L-S 7:00-14:00', googleQuery: 'Forn Sant Agusti Alzira' },
    { id: 'p1', name: "Parc de l'Alquenència",      category: 'parque', lat: 39.1520, lng: -0.4385, address: 'Ribera del Xúquer', description: 'Gran parque junto al río Xúquer, ideal para paseos', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Alzira_parc_alquenencia.jpg/640px-Alzira_parc_alquenencia.jpg', googleQuery: 'Parc Alquenencia Alzira' },
    { id: 'p4', name: 'Paseo Ribera del Xúquer',    category: 'parque', lat: 39.1510, lng: -0.4400, address: 'Ribera del río', description: 'Paseo fluvial con vistas al río', googleQuery: 'Paseo Ribera Xuquer Alzira' },
    { id: 'c5', name: 'Cafetería Ribera',          category: 'cafe', lat: 39.1512, lng: -0.4408, address: 'Paseo Ribera, 15', horario: 'L-D 8:00-22:00', googleQuery: 'Cafeteria Ribera Alzira' },
    { id: 'r2', name: 'Arrocería La Ribera',       category: 'restaurante', lat: 39.1518, lng: -0.4392, address: 'Paseo de la Ribera, 22', horario: 'L-D 13:00-16:30', description: 'Arroces y paellas tradicionales', googleQuery: 'Arroceria Ribera Alzira' },
    { id: 'r5', name: 'Restaurante La Murta',       category: 'restaurante', lat: 39.1485, lng: -0.4420, address: 'C/ de la Murta, 12', horario: 'L-S 13:00-16:00', description: 'Cocina casera valenciana', googleQuery: 'Restaurante La Murta Alzira' },
    { id: 'm4', name: 'Puente de San Bernardo',        category: 'monumento', lat: 39.1528, lng: -0.4410, address: 'Sobre el río Xúquer', description: 'Puente histórico con vistas al río', googleQuery: 'Puente San Bernardo Alzira' },
    { id: 'rb_r1', name: 'Restaurante Xúquer',     category: 'restaurante', lat: 39.1535, lng: -0.4425, address: 'Paseo Ribera Norte, 3', horario: 'L-D 13:00-16:00, 20:00-23:00', description: 'Terraza con vistas al río', googleQuery: 'Restaurante Xuquer Alzira' },
    { id: 'rb_c1', name: 'Kiosco Ribera',          category: 'cafe', lat: 39.1498, lng: -0.4418, address: 'Paseo Ribera Sur', horario: 'L-D 8:00-21:00', description: 'Kiosco junto al río, ideal para desayunos', googleQuery: 'Kiosco Ribera Alzira' },
    { id: 'f7', name: 'Farmacia Tulell',                category: 'farmacia', lat: 39.1535, lng: -0.4420, address: 'C/ Tulell, 18', horario: 'L-V 9:00-20:00', googleQuery: 'Farmacia Tulell Alzira' },
    { id: 's6', name: 'Consum Tulell',               category: 'super', lat: 39.1548, lng: -0.4430, address: 'C/ Tulell, 40', horario: 'L-S 9:00-21:00', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Consum_Supermercat_Algemesi.jpg/640px-Consum_Supermercat_Algemesi.jpg', googleQuery: 'Consum Tulell Alzira' },
    { id: 's7', name: 'Mas y Mas',                   category: 'super', lat: 39.1490, lng: -0.4410, address: 'Av. de la Ribera, 12', horario: 'L-S 9:00-21:00', googleQuery: 'Masymas Alzira' },
    { id: 'p7', name: 'Parc de la Alquerieta',       category: 'parque', lat: 39.1490, lng: -0.4445, address: 'Zona oeste, Alzira', description: 'Parque familiar con merenderos', googleQuery: 'Parc Alquerieta Alzira' },
    { id: 'b5', name: 'Pastelería El Dulce',       category: 'panaderia', lat: 39.1545, lng: -0.4395, address: 'Av. de la Ribera, 8', horario: 'L-S 7:30-20:30', googleQuery: 'Pasteleria Dulce Alzira' },
    { id: 'aq_f1', name: 'Farmacia Alquerieta',    category: 'farmacia', lat: 39.1560, lng: -0.4460, address: 'C/ Alquerieta, 14', horario: 'L-V 9:00-20:00', googleQuery: 'Farmacia Alquerieta Alzira' },
    { id: 'aq_s1', name: 'Consum Alquerieta',      category: 'super', lat: 39.1555, lng: -0.4475, address: 'Av. Alquerieta, 28', horario: 'L-S 9:00-21:00', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Consum_Supermercat_Algemesi.jpg/640px-Consum_Supermercat_Algemesi.jpg', googleQuery: 'Consum Alquerieta Alzira' },
    { id: 'aq_c1', name: 'Café El Puente',         category: 'cafe', lat: 39.1542, lng: -0.4448, address: 'Av. Alquerieta, 5', horario: 'L-D 7:30-21:00', googleQuery: 'Cafe Puente Alquerieta Alzira' },
    { id: 'aq_r1', name: 'Restaurante La Alquerieta', category: 'restaurante', lat: 39.1570, lng: -0.4488, address: 'C/ Alquerieta, 30', horario: 'L-S 13:00-16:00, 20:00-23:00', googleQuery: 'Restaurante Alquerieta Alzira' },
    { id: 'aq_b1', name: 'Horno Alquerieta',       category: 'panaderia', lat: 39.1558, lng: -0.4452, address: 'Av. Alquerieta, 10', horario: 'L-S 7:00-14:00, 17:00-20:00', googleQuery: 'Horno Alquerieta Alzira' },
    { id: 'aq_p1', name: 'Parque Alquerieta Norte', category: 'parque', lat: 39.1580, lng: -0.4490, address: 'Zona norte Alquerieta', description: 'Zona verde con bancos y columpios', googleQuery: 'Parque norte Alquerieta Alzira' },
    { id: 'f3', name: 'Farmacia Av. de la Hispanidad',  category: 'farmacia', lat: 39.1540, lng: -0.4290, address: 'Av. Hispanidad, 14', horario: 'L-V 9:30-20:00', googleQuery: 'Farmacia Hispanidad Alzira' },
    { id: 'f6', name: 'Farmacia Estación',              category: 'farmacia', lat: 39.1558, lng: -0.4315, address: 'Av. de la Estación, 5', horario: 'L-S 8:30-21:00', googleQuery: 'Farmacia Estacion Alzira' },
    { id: 's3', name: 'Lidl Alzira',                category: 'super', lat: 39.1555, lng: -0.4280, address: 'Av. de la Hispanidad', horario: 'L-S 9:00-21:30', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Lidl_in_Afragola%2C_Italy%2C_2020.jpg/640px-Lidl_in_Afragola%2C_Italy%2C_2020.jpg', googleQuery: 'Lidl Alzira' },
    { id: 's8', name: 'Consum Estación',             category: 'super', lat: 39.1565, lng: -0.4340, address: 'C/ de la Estación, 20', horario: 'L-S 9:00-21:00', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Consum_Supermercat_Algemesi.jpg/640px-Consum_Supermercat_Algemesi.jpg', googleQuery: 'Consum Estacion Alzira' },
    { id: 'p3', name: "Parc de l'Estació",           category: 'parque', lat: 39.1545, lng: -0.4320, address: 'Junto estación RENFE', description: 'Parque urbano con zona infantil', googleQuery: 'Parc Estacio Alzira' },
    { id: 'c7', name: 'Horchatería Daniel',        category: 'cafe', lat: 39.1550, lng: -0.4370, address: 'Av. Santos Patronos, 50', horario: 'L-D 9:00-22:00', googleQuery: 'Horchateria Daniel Alzira' },
    { id: 'b3', name: 'Horno La Tradición',        category: 'panaderia', lat: 39.1540, lng: -0.4342, address: 'Av. de la Hispanidad, 6', horario: 'L-S 7:00-20:00', googleQuery: 'Horno Tradicion Alzira' },
    { id: 'r7', name: 'Kebab Damasco',              category: 'restaurante', lat: 39.1542, lng: -0.4310, address: 'Av. Luis Suñer, 18', horario: 'L-D 12:00-01:00', googleQuery: 'Kebab Damasco Alzira' },
    { id: 'h5', name: 'Cruz Roja Alzira',               category: 'salud', lat: 39.1538, lng: -0.4355, address: 'C/ Constitución, 8', phone: '962 41 05 50', horario: 'L-V 9:00-14:00', googleQuery: 'Cruz Roja Alzira' },
    { id: 'n_m1', name: 'Estación de RENFE Alzira', category: 'monumento', lat: 39.1562, lng: -0.4318, address: 'Av. de la Estación', description: 'Estación de ferrocarril, conexión Valencia-Xàtiva', googleQuery: 'Estacion RENFE Alzira' },
    { id: 'n_f1', name: 'Farmacia Norte',           category: 'farmacia', lat: 39.1595, lng: -0.4330, address: 'Av. Sants Patrons, 80', horario: 'L-V 9:00-20:30', googleQuery: 'Farmacia norte Alzira' },
    { id: 'n_s1', name: 'Mercadona Norte Alzira',   category: 'super', lat: 39.1605, lng: -0.4305, address: 'Av. de la Hispanidad Norte', horario: 'L-S 9:00-21:30', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Mercadona_Picanya.jpg/640px-Mercadona_Picanya.jpg', googleQuery: 'Mercadona norte Alzira' },
    { id: 'n_c1', name: 'Cafetería La Estación',    category: 'cafe', lat: 39.1568, lng: -0.4322, address: 'C/ de la Estación, 2', horario: 'L-D 6:30-22:00', googleQuery: 'Cafeteria Estacion Alzira' },
    { id: 'n_r1', name: 'Pizzería Nápoles',         category: 'restaurante', lat: 39.1588, lng: -0.4298, address: 'Av. de la Hispanidad, 45', horario: 'L-D 12:00-23:00', googleQuery: 'Pizzeria Napoles Alzira' },
    { id: 'n_b1', name: 'Forn de Pa Nord',          category: 'panaderia', lat: 39.1592, lng: -0.4312, address: 'C/ Norte, 8', horario: 'L-S 6:30-14:00', googleQuery: 'Forn Pa Nord Alzira' },
    { id: 'n_p1', name: 'Parque Zona Norte',        category: 'parque', lat: 39.1610, lng: -0.4318, address: 'Av. Nord', description: 'Parque con pistas deportivas y zona infantil', googleQuery: 'Parque norte Alzira' },
    { id: 'h2', name: 'Hospital de la Ribera',          category: 'salud', lat: 39.1580, lng: -0.4250, address: 'Ctra. de Corbera km 1', phone: '962 45 81 00', horario: '24h', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/Hospital_Universitari_de_la_Ribera_01.jpg/640px-Hospital_Universitari_de_la_Ribera_01.jpg', googleQuery: 'Hospital de la Ribera Alzira' },
    { id: 'p6', name: 'Jardines del Hospital',       category: 'parque', lat: 39.1575, lng: -0.4260, address: 'Junto al Hospital de la Ribera', description: 'Zona verde junto al hospital', googleQuery: 'Jardines Hospital Ribera Alzira' },
    { id: 'ho_f1', name: 'Farmacia Hospital',       category: 'farmacia', lat: 39.1585, lng: -0.4242, address: 'Ctra. Corbera, 3', horario: 'L-V 8:00-22:00', googleQuery: 'Farmacia Hospital Ribera Alzira' },
    { id: 'ho_c1', name: 'Cafetería del Hospital',  category: 'cafe', lat: 39.1578, lng: -0.4248, address: 'Interior Hospital de la Ribera', horario: 'L-D 7:00-21:00', googleQuery: 'Cafeteria Hospital Ribera Alzira' },
    { id: 'ho_s1', name: 'Consum Zona Hospital',    category: 'super', lat: 39.1590, lng: -0.4235, address: 'Ctra. de Corbera, 8', horario: 'L-S 9:00-21:00', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Consum_Supermercat_Algemesi.jpg/640px-Consum_Supermercat_Algemesi.jpg', googleQuery: 'Consum Hospital Alzira' },
    { id: 'ho_r1', name: 'Restaurante La Corbera',  category: 'restaurante', lat: 39.1592, lng: -0.4222, address: 'Ctra. Corbera km 2', horario: 'L-S 13:00-16:00', description: 'Cocina mediterránea junto al hospital', googleQuery: 'Restaurante Corbera Alzira' },
    { id: 'f8', name: 'Farmacia Alborxí',               category: 'farmacia', lat: 39.1465, lng: -0.4250, address: "Camí d'Alborxí, 3", horario: 'L-V 9:00-21:00', googleQuery: 'Farmacia Alborxi Alzira' },
    { id: 's4', name: 'Aldi Alzira',                category: 'super', lat: 39.1475, lng: -0.4255, address: 'C/ Pere Morell, 1', horario: 'L-S 9:00-21:00', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/ALDI_Nord_201x_logo.svg/440px-ALDI_Nord_201x_logo.svg.png', googleQuery: 'Aldi Alzira' },
    { id: 'al_s1', name: 'Mercadona Alborxí',       category: 'super', lat: 39.1445, lng: -0.4230, address: "Camí d'Alborxí, 15", horario: 'L-S 9:00-21:30', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Mercadona_Picanya.jpg/640px-Mercadona_Picanya.jpg', googleQuery: 'Mercadona Alborxi Alzira' },
    { id: 'al_f1', name: 'Farmacia Pere Morell',    category: 'farmacia', lat: 39.1455, lng: -0.4263, address: 'C/ Pere Morell, 35', horario: 'L-V 9:00-20:00', googleQuery: 'Farmacia Pere Morell Alzira' },
    { id: 'al_c1', name: 'Bar El Polígono',         category: 'cafe', lat: 39.1430, lng: -0.4215, address: 'Zona Industrial Alborxí', horario: 'L-V 7:00-17:00', googleQuery: 'Bar Poligono Alzira' },
    { id: 'al_r1', name: 'Restaurante Alborxí',     category: 'restaurante', lat: 39.1440, lng: -0.4240, address: "Camí d'Alborxí, 22", horario: 'L-S 12:00-16:00', googleQuery: 'Restaurante Alborxi Alzira' },
    { id: 'al_b1', name: 'Forn Alborxí',            category: 'panaderia', lat: 39.1450, lng: -0.4248, address: "Camí d'Alborxí, 10", horario: 'L-S 7:00-14:00', googleQuery: 'Forn Alborxi Alzira' },
    { id: 'al_p1', name: 'Zona Verde Alborxí',      category: 'parque', lat: 39.1435, lng: -0.4258, address: 'Camino de Alborxí', description: 'Pequeña plaza ajardinada', googleQuery: 'Parque Alborxi Alzira' },
    { id: 'p2', name: 'Jardí de la Murta',           category: 'parque', lat: 39.1480, lng: -0.4350, address: 'Junto antiguo convento', description: 'Jardín histórico con fuentes y bancos', googleQuery: 'Jardi de la Murta Alzira' },
    { id: 'p5', name: "Parc de l'Aigüera",           category: 'parque', lat: 39.1440, lng: -0.4330, address: 'Zona Sur, Alzira', description: 'Parque con árboles centenarios', googleQuery: 'Parc Aiguera Alzira' },
    { id: 'su_f1', name: 'Farmacia Sur',             category: 'farmacia', lat: 39.1418, lng: -0.4340, address: 'Av. del Sur, 12', horario: 'L-V 9:00-20:00', googleQuery: 'Farmacia Sur Alzira' },
    { id: 'su_s1', name: 'Consum Sur',               category: 'super', lat: 39.1410, lng: -0.4350, address: 'Av. del Sur, 22', horario: 'L-S 9:00-21:00', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Consum_Supermercat_Algemesi.jpg/640px-Consum_Supermercat_Algemesi.jpg', googleQuery: 'Consum Sur Alzira' },
    { id: 'su_c1', name: 'Cafetería Aigüera',        category: 'cafe', lat: 39.1425, lng: -0.4335, address: 'C/ Aigüera, 5', horario: 'L-D 8:00-21:00', googleQuery: 'Cafeteria Aiguera Alzira' },
    { id: 'su_r1', name: 'Restaurante El Sur',       category: 'restaurante', lat: 39.1408, lng: -0.4360, address: 'Av. del Sur, 30', horario: 'L-S 13:00-16:00, 20:00-23:00', googleQuery: 'Restaurante Sur Alzira' },
    { id: 'su_b1', name: 'Horno del Sur',            category: 'panaderia', lat: 39.1420, lng: -0.4348, address: 'C/ del Sur, 8', horario: 'L-S 7:00-14:00, 17:00-20:00', googleQuery: 'Horno Sur Alzira' },
    { id: 'su_p1', name: 'Parque Sur Alzira',        category: 'parque', lat: 39.1395, lng: -0.4345, address: 'Zona sur, junto CV-50', description: 'Parque con pista de petanca y bancos', googleQuery: 'Parque Sur Alzira' },
    { id: 'su_h1', name: 'Consultorio Sur',          category: 'salud', lat: 39.1400, lng: -0.4355, address: 'Av. del Sur, 40', phone: '962 41 03 20', horario: 'L-V 8:00-15:00', googleQuery: 'Consultorio Sur Alzira' },
    { id: 've_f1', name: 'Farmacia Venecia',         category: 'farmacia', lat: 39.1475, lng: -0.4462, address: 'Av. Venecia, 8', horario: 'L-V 9:00-20:00', googleQuery: 'Farmacia Venecia Alzira' },
    { id: 've_s1', name: 'Supermercado Venecia',     category: 'super', lat: 39.1468, lng: -0.4480, address: 'Av. Venecia, 20', horario: 'L-S 9:00-21:00', googleQuery: 'Supermercado Venecia Alzira' },
    { id: 've_c1', name: 'Bar Venecia',              category: 'cafe', lat: 39.1470, lng: -0.4468, address: 'Av. Venecia, 12', horario: 'L-D 7:00-22:00', googleQuery: 'Bar Venecia Alzira' },
    { id: 've_r1', name: 'Restaurante El Xúquer',   category: 'restaurante', lat: 39.1480, lng: -0.4475, address: 'Paseo del Xúquer, 5', horario: 'L-D 13:00-16:00, 20:00-23:30', description: 'Terraza con vistas al meandro del Xúquer', googleQuery: 'Restaurante Xuquer Alzira' },
    { id: 've_p1', name: 'Paseo de Venecia',         category: 'parque', lat: 39.1478, lng: -0.4492, address: 'Ribera Xúquer Sur', description: 'Paseo junto al meandro del río, vistas espectaculares', googleQuery: 'Paseo Venecia Alzira' },
    { id: 've_b1', name: 'Forn Venecia',             category: 'panaderia', lat: 39.1465, lng: -0.4470, address: 'Av. Venecia, 15', horario: 'L-S 7:00-14:00', googleQuery: 'Horno Venecia Alzira' },
    { id: 'pn_s1', name: 'Carrefour Express',       category: 'super', lat: 39.1635, lng: -0.4290, address: 'CV-50 zona norte', horario: 'L-S 9:00-21:30', googleQuery: 'Carrefour Express Alzira' },
    { id: 'pn_s2', name: 'Consum CV-50',            category: 'super', lat: 39.1625, lng: -0.4320, address: 'CV-50, km 2', horario: 'L-S 9:00-21:00', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Consum_Supermercat_Algemesi.jpg/640px-Consum_Supermercat_Algemesi.jpg', googleQuery: 'Consum CV-50 Alzira' },
    { id: 'pn_r1', name: 'McDonalds Alzira',        category: 'restaurante', lat: 39.1640, lng: -0.4275, address: 'CV-50 Norte', horario: 'L-D 8:00-01:00', googleQuery: 'McDonalds Alzira' },
    { id: 'pn_r2', name: 'Burger King Alzira',      category: 'restaurante', lat: 39.1645, lng: -0.4260, address: 'CV-50 Norte', horario: 'L-D 11:00-00:00', googleQuery: 'Burger King Alzira' },
    { id: 'pn_r3', name: 'Telepizza Alzira',        category: 'restaurante', lat: 39.1628, lng: -0.4285, address: 'CV-50 Norte', horario: 'L-D 12:00-23:30', googleQuery: 'Telepizza Alzira' },
    { id: 'pn_c1', name: 'Gasolinera Repsol (cafetería)', category: 'cafe', lat: 39.1650, lng: -0.4250, address: 'CV-50 Norte', horario: 'L-D 6:00-22:00', googleQuery: 'Gasolinera Repsol Alzira norte' },
    { id: 'pn_f1', name: 'Farmacia CV-50',          category: 'farmacia', lat: 39.1632, lng: -0.4300, address: 'CV-50, 15', horario: 'L-V 9:00-20:00', googleQuery: 'Farmacia CV-50 Alzira' },
    { id: 'tr_f1', name: 'Farmacia El Tremolar',    category: 'farmacia', lat: 39.1505, lng: -0.4210, address: 'Av. del Tremolar, 8', horario: 'L-V 9:00-20:00', googleQuery: 'Farmacia Tremolar Alzira' },
    { id: 'tr_s1', name: 'Consum El Tremolar',      category: 'super', lat: 39.1510, lng: -0.4198, address: 'Av. del Tremolar, 20', horario: 'L-S 9:00-21:00', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Consum_Supermercat_Algemesi.jpg/640px-Consum_Supermercat_Algemesi.jpg', googleQuery: 'Consum Tremolar Alzira' },
    { id: 'tr_c1', name: 'Bar El Tremolar',         category: 'cafe', lat: 39.1498, lng: -0.4205, address: 'C/ del Tremolar, 5', horario: 'L-D 7:00-21:00', googleQuery: 'Bar Tremolar Alzira' },
    { id: 'tr_r1', name: 'Restaurante La Huerta',   category: 'restaurante', lat: 39.1515, lng: -0.4185, address: 'Camí del Tremolar', horario: 'L-S 13:00-16:00', description: 'Restaurante rodeado de huerta valenciana', googleQuery: 'Restaurante Huerta Tremolar Alzira' },
    { id: 'tr_b1', name: 'Horno El Tremolar',       category: 'panaderia', lat: 39.1502, lng: -0.4215, address: 'C/ del Tremolar, 12', horario: 'L-S 7:00-14:00', googleQuery: 'Horno Tremolar Alzira' },
    { id: 'tr_p1', name: 'Parque El Tremolar',      category: 'parque', lat: 39.1520, lng: -0.4190, address: 'Av. del Tremolar', description: 'Parque con zona de ejercicio al aire libre', googleQuery: 'Parque Tremolar Alzira' },
    { id: 'm6', name: 'Monasterio de la Murta',         category: 'monumento', lat: 39.1350, lng: -0.4200, address: 'Paraje de la Murta', description: 'Ruinas del monasterio jerónimo del s.XIV, a 3km del centro', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Monestir_de_la_Murta_%28Alzira%29_-_44.jpg/640px-Monestir_de_la_Murta_%28Alzira%29_-_44.jpg', googleQuery: 'Monasterio de la Murta Alzira' },
    { id: 'mu_p1', name: 'Sendero de la Murta',     category: 'parque', lat: 39.1370, lng: -0.4180, address: 'Paraje de la Murta', description: 'Ruta de senderismo entre naranjos y montaña, 5km', googleQuery: 'Sendero Murta Alzira' },
    { id: 'mu_p2', name: 'Mirador de la Casella',   category: 'parque', lat: 39.1320, lng: -0.4150, address: 'Serra de Corbera', description: 'Vistas panorámicas de Alzira y la Ribera', googleQuery: 'Mirador Casella Alzira' },
    { id: 'mu_m1', name: 'Cruz de la Murta',        category: 'monumento', lat: 39.1340, lng: -0.4170, address: 'Paraje de la Murta', description: 'Cruz de piedra del s.XVI en el camino al monasterio', googleQuery: 'Cruz Murta Alzira' },
    { id: 'pi_s1', name: 'Mercadona Polígono',      category: 'super', lat: 39.1380, lng: -0.4310, address: 'Pol. Ind. Sur, Parcela 12', horario: 'L-S 9:00-21:30', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Mercadona_Picanya.jpg/640px-Mercadona_Picanya.jpg', googleQuery: 'Mercadona Poligono Alzira' },
    { id: 'pi_r1', name: 'Restaurante El Polígono', category: 'restaurante', lat: 39.1375, lng: -0.4320, address: 'Pol. Ind. Sur', horario: 'L-V 12:00-16:00', description: 'Menú del día económico, popular entre trabajadores', googleQuery: 'Restaurante Poligono Alzira' },
    { id: 'pi_c1', name: 'Cafetería Industrial',    category: 'cafe', lat: 39.1385, lng: -0.4305, address: 'Pol. Ind. Sur', horario: 'L-V 6:30-18:00', googleQuery: 'Cafeteria Poligono Alzira' },
    { id: 'pi_f1', name: 'Farmacia Polígono Sur',   category: 'farmacia', lat: 39.1390, lng: -0.4298, address: 'Pol. Ind. Sur, entrada', horario: 'L-V 9:00-20:00', googleQuery: 'Farmacia Poligono Alzira' },
    { id: 'to_s1', name: 'Lidl Zona Oeste',         category: 'super', lat: 39.1510, lng: -0.4530, address: 'Ctra. Tavernes, km 1', horario: 'L-S 9:00-21:30', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Lidl_in_Afragola%2C_Italy%2C_2020.jpg/640px-Lidl_in_Afragola%2C_Italy%2C_2020.jpg', googleQuery: 'Lidl Tavernes Alzira' },
    { id: 'to_r1', name: 'Restaurante La Caseta',   category: 'restaurante', lat: 39.1505, lng: -0.4545, address: 'Ctra. Tavernes', horario: 'L-D 13:00-16:00', description: 'Arroces tradicionales en barraca valenciana', googleQuery: 'Restaurante Caseta Alzira' },
    { id: 'to_f1', name: 'Farmacia Ctra. Tavernes', category: 'farmacia', lat: 39.1515, lng: -0.4520, address: 'Ctra. Tavernes, 5', horario: 'L-V 9:00-20:00', googleQuery: 'Farmacia Tavernes Alzira' },
    { id: 'to_p1', name: 'Huerta del Xúquer',       category: 'parque', lat: 39.1520, lng: -0.4560, address: 'Camino huerta oeste', description: 'Paseo entre naranjos y campos de arroz junto al Xúquer', googleQuery: 'Huerta Xuquer Alzira' },
    { id: 'to_c1', name: 'Bar La Caseta',           category: 'cafe', lat: 39.1508, lng: -0.4540, address: 'Ctra. Tavernes, 2', horario: 'L-D 7:00-20:00', googleQuery: 'Bar Caseta Tavernes Alzira' },
    { id: 'co_f1', name: 'Farmacia Corbera Rd.',    category: 'farmacia', lat: 39.1620, lng: -0.4215, address: 'Ctra. de Corbera, 12', horario: 'L-V 9:00-20:00', googleQuery: 'Farmacia Corbera Alzira' },
    { id: 'co_s1', name: 'Consum Ctra. Corbera',    category: 'super', lat: 39.1615, lng: -0.4225, address: 'Ctra. de Corbera, 8', horario: 'L-S 9:00-21:00', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Consum_Supermercat_Algemesi.jpg/640px-Consum_Supermercat_Algemesi.jpg', googleQuery: 'Consum Corbera Alzira' },
    { id: 'co_r1', name: 'Venta La Corbera',        category: 'restaurante', lat: 39.1632, lng: -0.4200, address: 'Ctra. de Corbera km 3', horario: 'L-D 12:00-17:00', description: 'Venta típica con paellas en leña', googleQuery: 'Venta Corbera Alzira' },
    { id: 'co_p1', name: 'Parque Deportivo Corbera', category: 'parque', lat: 39.1625, lng: -0.4210, address: 'Zona Deportiva, Ctra. Corbera', description: 'Pistas de pádel, tenis y fútbol', googleQuery: 'Zona Deportiva Corbera Alzira' },
    { id: 'co_m1', name: 'Ermita de Sant Bernat',    category: 'monumento', lat: 39.1650, lng: -0.4185, address: 'Serra de Corbera', description: 'Ermita del s.XVI con vistas a todo el valle', googleQuery: 'Ermita Sant Bernat Alzira' },
    { id: 'sa_f1', name: 'Farmacia Sant Agustí',    category: 'farmacia', lat: 39.1472, lng: -0.4310, address: 'C/ Sant Agustí, 15', horario: 'L-V 9:00-20:00', googleQuery: 'Farmacia Sant Agusti Alzira' },
    { id: 'sa_c1', name: 'Café del Barrio',         category: 'cafe', lat: 39.1468, lng: -0.4318, address: 'C/ Sant Agustí, 22', horario: 'L-D 7:00-21:00', googleQuery: 'Cafe Sant Agusti Alzira' },
    { id: 'sa_r1', name: 'Arrocería Sant Agustí',   category: 'restaurante', lat: 39.1465, lng: -0.4305, address: 'C/ Sant Agustí, 28', horario: 'L-D 13:00-16:00', description: 'Arroz al horno tradicional', googleQuery: 'Arroceria Sant Agusti Alzira' },
    { id: 'sa_m1', name: 'Iglesia de Sant Agustí',  category: 'monumento', lat: 39.1475, lng: -0.4325, address: 'Plaça Sant Agustí', description: 'Iglesia barroca del s.XVII', googleQuery: 'Iglesia Sant Agusti Alzira' },
    { id: 'sa_p1', name: 'Plaza Sant Agustí',       category: 'parque', lat: 39.1478, lng: -0.4320, address: 'Plaça Sant Agustí', description: 'Plaza con fuente y árboles centenarios', googleQuery: 'Plaza Sant Agusti Alzira' },
    { id: 'ba_f1', name: 'Farmacia Aigües Vives',   category: 'farmacia', lat: 39.1680, lng: -0.4180, address: "Camí d'Aigües Vives, 3", horario: 'L-V 9:00-14:00', googleQuery: 'Farmacia Aigues Vives Alzira' },
    { id: 'ba_s1', name: 'Tienda Aigües Vives',     category: 'super', lat: 39.1685, lng: -0.4175, address: "C/ d'Aigües Vives, 10", horario: 'L-S 8:00-14:00, 17:00-20:00', googleQuery: 'Tienda Aigues Vives Alzira' },
    { id: 'ba_c1', name: "Bar d'Aigües Vives",      category: 'cafe', lat: 39.1688, lng: -0.4170, address: "Plaça d'Aigües Vives", horario: 'L-D 7:00-22:00', googleQuery: 'Bar Aigues Vives Alzira' },
    { id: 'ba_r1', name: 'Venta Aigües Vives',      category: 'restaurante', lat: 39.1695, lng: -0.4165, address: "Camí d'Aigües Vives", horario: 'S-D 13:00-16:00', description: 'Paella de leña los domingos', googleQuery: 'Venta Aigues Vives Alzira' },
    { id: 'ba_p1', name: 'Parque Aigües Vives',     category: 'parque', lat: 39.1690, lng: -0.4172, address: 'Zona verde pedanía', description: 'Pequeño parque con frontón y zona infantil', googleQuery: 'Parque Aigues Vives Alzira' },
    { id: 'mx_m1', name: 'Pont de Ferro (Puente de Hierro)', category: 'monumento', lat: 39.1540, lng: -0.4440, address: 'Sobre el río Xúquer, zona norte', description: 'Puente metálico histórico del s.XIX sobre el Xúquer', googleQuery: 'Pont Ferro Alzira' },
    { id: 'mx_m2', name: 'Mercat Municipal',         category: 'monumento', lat: 39.1495, lng: -0.4358, address: 'Plaça del Mercat', description: 'Mercado modernista de principios del s.XX, aún en funcionamiento', googleQuery: 'Mercat Municipal Alzira' },
    { id: 'mx_m3', name: 'Teatro Municipal',         category: 'monumento', lat: 39.1508, lng: -0.4375, address: 'C/ del Teatre', description: 'Teatro histórico restaurado, programación cultural activa', googleQuery: 'Teatro Municipal Alzira' },
    { id: 'mx_m4', name: 'Antiguo Convento de Santa Lucía', category: 'monumento', lat: 39.1488, lng: -0.4395, address: 'C/ Santa Lucía', description: 'Convento del s.XIV, hoy espacio cultural', googleQuery: 'Convento Santa Lucia Alzira' },
    { id: 'mx_m5', name: 'Torre del Agua',           category: 'monumento', lat: 39.1465, lng: -0.4340, address: 'C/ de la Torre', description: 'Torre de vigilancia medieval restaurada', googleQuery: 'Torre Agua Alzira' },
    { id: 'cx_f1', name: 'Farmacia Central Carcaixent',  category: 'farmacia', lat: 39.1228, lng: -0.4448, address: 'Plaça del Mercat, 5, Carcaixent', horario: 'L-V 9:00-20:30', googleQuery: 'Farmacia Central Carcaixent' },
    { id: 'cx_f2', name: 'Farmacia Calle Mayor',         category: 'farmacia', lat: 39.1215, lng: -0.4462, address: 'C/ Major, 20, Carcaixent', horario: 'L-S 9:00-21:00', googleQuery: 'Farmacia Calle Mayor Carcaixent' },
    { id: 'cx_f3', name: 'Farmacia San Francisco',       category: 'farmacia', lat: 39.1240, lng: -0.4430, address: 'C/ San Francisco, 8, Carcaixent', horario: 'L-V 9:00-20:00', googleQuery: 'Farmacia San Francisco Carcaixent' },
    { id: 'cx_s1', name: 'Mercadona Carcaixent',     category: 'super', lat: 39.1205, lng: -0.4420, address: 'Av. de la Ribera, Carcaixent', horario: 'L-S 9:00-21:30', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Mercadona_Picanya.jpg/640px-Mercadona_Picanya.jpg', googleQuery: 'Mercadona Carcaixent' },
    { id: 'cx_s2', name: 'Consum Carcaixent',        category: 'super', lat: 39.1235, lng: -0.4455, address: 'C/ Major, 45, Carcaixent', horario: 'L-S 9:00-21:00', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Consum_Supermercat_Algemesi.jpg/640px-Consum_Supermercat_Algemesi.jpg', googleQuery: 'Consum Carcaixent' },
    { id: 'cx_s3', name: 'Lidl Carcaixent',          category: 'super', lat: 39.1195, lng: -0.4405, address: 'Ctra. de Xàtiva, Carcaixent', horario: 'L-S 9:00-21:30', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Lidl_in_Afragola%2C_Italy%2C_2020.jpg/640px-Lidl_in_Afragola%2C_Italy%2C_2020.jpg', googleQuery: 'Lidl Carcaixent' },
    { id: 'cx_h1', name: 'Centro de Salud Carcaixent',   category: 'salud', lat: 39.1220, lng: -0.4440, address: 'C/ Hospital, 12, Carcaixent', phone: '962 43 00 50', horario: 'L-V 8:00-20:00', googleQuery: 'Centro Salud Carcaixent' },
    { id: 'cx_h2', name: 'Consultorio Médico Carcaixent', category: 'salud', lat: 39.1250, lng: -0.4468, address: 'C/ de la Pau, 5, Carcaixent', phone: '962 43 10 20', googleQuery: 'Consultorio Carcaixent' },
    { id: 'cx_c1', name: 'Café del Mercat Carcaixent', category: 'cafe', lat: 39.1225, lng: -0.4452, address: 'Plaça del Mercat, 3, Carcaixent', horario: 'L-D 7:00-21:00', googleQuery: 'Cafe Mercat Carcaixent' },
    { id: 'cx_c2', name: 'Bar La Plaça Carcaixent',  category: 'cafe', lat: 39.1232, lng: -0.4445, address: 'Plaça Major, 2, Carcaixent', horario: 'L-D 7:30-22:00', googleQuery: 'Bar Plaça Carcaixent' },
    { id: 'cx_c3', name: 'Heladería Xúquer Carcaixent', category: 'cafe', lat: 39.1210, lng: -0.4435, address: 'Av. de la Ribera, 8, Carcaixent', horario: 'L-D 10:00-22:00', googleQuery: 'Heladeria Carcaixent' },
    { id: 'cx_b1', name: 'Forn de Pa Carcaixent',    category: 'panaderia', lat: 39.1218, lng: -0.4458, address: 'C/ Major, 12, Carcaixent', horario: 'L-S 7:00-14:00, 17:00-20:00', googleQuery: 'Forn Pa Carcaixent' },
    { id: 'cx_b2', name: 'Pastelería La Naranja',    category: 'panaderia', lat: 39.1242, lng: -0.4442, address: 'C/ San Antonio, 5, Carcaixent', horario: 'L-S 7:30-20:30', googleQuery: 'Pasteleria Naranja Carcaixent' },
    { id: 'cx_r1', name: 'Restaurante Casa Rafael',  category: 'restaurante', lat: 39.1222, lng: -0.4460, address: 'C/ Major, 30, Carcaixent', horario: 'L-S 13:00-16:00, 20:00-23:00', googleQuery: 'Restaurante Casa Rafael Carcaixent' },
    { id: 'cx_r2', name: 'Arrocería El Hort',        category: 'restaurante', lat: 39.1200, lng: -0.4425, address: 'Av. de la Ribera, 15, Carcaixent', horario: 'L-D 13:00-16:00', description: 'Arroces al horno y paellas valencianas', googleQuery: 'Arroceria Hort Carcaixent' },
    { id: 'cx_r3', name: 'Pizzería Bella Napoli',    category: 'restaurante', lat: 39.1238, lng: -0.4435, address: 'C/ San Francisco, 15, Carcaixent', horario: 'L-D 12:00-23:00', googleQuery: 'Pizzeria Bella Napoli Carcaixent' },
    { id: 'cx_r4', name: 'Bar Tapas El Racó',        category: 'restaurante', lat: 39.1245, lng: -0.4470, address: 'C/ de la Pau, 10, Carcaixent', horario: 'L-S 11:00-23:30', googleQuery: 'Bar Tapas Raco Carcaixent' },
    { id: 'cx_p1', name: 'Parc de la Glorieta',      category: 'parque', lat: 39.1230, lng: -0.4465, address: 'Centre, Carcaixent', description: 'Parque principal con fuente y bancos a la sombra', googleQuery: 'Parc Glorieta Carcaixent' },
    { id: 'cx_p2', name: 'Hort de Soriano',          category: 'parque', lat: 39.1252, lng: -0.4415, address: 'C/ de l\'Hort, Carcaixent', description: 'Jardín histórico del s.XIX con naranjos centenarios', googleQuery: 'Hort Soriano Carcaixent' },
    { id: 'cx_p3', name: 'Paseo del Río Carcaixent', category: 'parque', lat: 39.1190, lng: -0.4440, address: 'Ribera del Xúquer', description: 'Paseo fluvial junto al río', googleQuery: 'Paseo Rio Carcaixent' },
    { id: 'cx_m1', name: 'Iglesia Assumpció de Carcaixent', category: 'monumento', lat: 39.1225, lng: -0.4450, address: 'Plaça Major, Carcaixent', description: 'Iglesia parroquial barroca del s.XVII, campanario emblemático', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Carcaixent_Asuncion.jpg/440px-Carcaixent_Asuncion.jpg', googleQuery: 'Iglesia Asuncion Carcaixent' },
    { id: 'cx_m2', name: 'Casa Consistorial Carcaixent',  category: 'monumento', lat: 39.1228, lng: -0.4455, address: 'Plaça Major, 1, Carcaixent', description: 'Ayuntamiento neoclásico del s.XIX', googleQuery: 'Ayuntamiento Carcaixent' },
    { id: 'cx_m3', name: 'Monasterio de Aguas Vivas',     category: 'monumento', lat: 39.1100, lng: -0.4250, address: 'Paraje Aguas Vivas, Carcaixent', description: 'Monasterio del s.XIII en un valle rodeado de montaña', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/Monestir_d%27Aig%C3%BCes_Vives_de_Carcaixent_02.jpg/640px-Monestir_d%27Aig%C3%BCes_Vives_de_Carcaixent_02.jpg', googleQuery: 'Monasterio Aguas Vivas Carcaixent' },
    { id: 'cx_m4', name: 'Ermita del Calvari',            category: 'monumento', lat: 39.1260, lng: -0.4400, address: 'Muntanya del Calvari, Carcaixent', description: 'Ermita con vistas panorámicas a toda la Ribera', googleQuery: 'Ermita Calvari Carcaixent' },
    { id: 'ag_f1', name: 'Farmacia Central Algemesí',    category: 'farmacia', lat: 39.1898, lng: -0.4355, address: 'Plaça Major, 4, Algemesí', horario: 'L-V 9:00-20:30', googleQuery: 'Farmacia Central Algemesi' },
    { id: 'ag_f2', name: 'Farmacia Valencia Algemesí',   category: 'farmacia', lat: 39.1885, lng: -0.4340, address: 'C/ Valencia, 22, Algemesí', horario: 'L-S 9:00-21:00', googleQuery: 'Farmacia Valencia Algemesi' },
    { id: 'ag_s1', name: 'Mercadona Algemesí',       category: 'super', lat: 39.1870, lng: -0.4330, address: 'Av. de la Ribera, Algemesí', horario: 'L-S 9:00-21:30', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Mercadona_Picanya.jpg/640px-Mercadona_Picanya.jpg', googleQuery: 'Mercadona Algemesi' },
    { id: 'ag_s2', name: 'Consum Algemesí',          category: 'super', lat: 39.1905, lng: -0.4360, address: 'C/ Major, 50, Algemesí', horario: 'L-S 9:00-21:00', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Consum_Supermercat_Algemesi.jpg/640px-Consum_Supermercat_Algemesi.jpg', googleQuery: 'Consum Algemesi' },
    { id: 'ag_h1', name: 'Centro de Salud Algemesí',     category: 'salud', lat: 39.1892, lng: -0.4345, address: 'C/ de la Salut, 3, Algemesí', phone: '962 48 01 00', horario: 'L-V 8:00-20:00', googleQuery: 'Centro Salud Algemesi' },
    { id: 'ag_c1', name: 'Café La Muixeranga',       category: 'cafe', lat: 39.1900, lng: -0.4352, address: 'Plaça Major, 6, Algemesí', horario: 'L-D 7:30-21:00', googleQuery: 'Cafe Muixeranga Algemesi' },
    { id: 'ag_c2', name: 'Horchatería Algemesí',     category: 'cafe', lat: 39.1888, lng: -0.4365, address: 'C/ Sant Pere, 12, Algemesí', horario: 'L-D 9:00-22:00', googleQuery: 'Horchateria Algemesi' },
    { id: 'ag_b1', name: 'Forn de Pa Algemesí',      category: 'panaderia', lat: 39.1895, lng: -0.4348, address: 'C/ Major, 35, Algemesí', horario: 'L-S 7:00-14:00, 17:00-20:00', googleQuery: 'Forn Pa Algemesi' },
    { id: 'ag_r1', name: 'Restaurante La Muixeranga', category: 'restaurante', lat: 39.1902, lng: -0.4358, address: 'C/ Major, 40, Algemesí', horario: 'L-S 13:00-16:00, 20:00-23:00', description: 'Cocina valenciana tradicional', googleQuery: 'Restaurante Muixeranga Algemesi' },
    { id: 'ag_r2', name: 'Pizzería Da Vinci Algemesí', category: 'restaurante', lat: 39.1880, lng: -0.4335, address: 'Av. de la Ribera, 10, Algemesí', horario: 'L-D 12:00-23:00', googleQuery: 'Pizzeria Da Vinci Algemesi' },
    { id: 'ag_p1', name: 'Parc Municipal Algemesí',  category: 'parque', lat: 39.1908, lng: -0.4342, address: 'Centre, Algemesí', description: 'Parque urbano con zona infantil y fuentes', googleQuery: 'Parc Municipal Algemesi' },
    { id: 'ag_m1', name: 'Basílica de Sant Jaume',       category: 'monumento', lat: 39.1897, lng: -0.4350, address: 'Plaça Major, Algemesí', description: 'Basílica gótica, escenario de la Muixeranga (Patrimonio UNESCO)', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Algemesi_Basilica.jpg/440px-Algemesi_Basilica.jpg', googleQuery: 'Basilica Sant Jaume Algemesi' },
    { id: 'ag_m2', name: 'Museu de la Festa',            category: 'monumento', lat: 39.1894, lng: -0.4355, address: 'C/ de la Fira, 5, Algemesí', description: 'Museo dedicado a la Muixeranga, Patrimonio de la Humanidad', googleQuery: 'Museu Festa Algemesi' },
    { id: 'gu_f1', name: 'Farmacia Guadassuar',          category: 'farmacia', lat: 39.1745, lng: -0.4010, address: 'C/ Major, 8, Guadassuar', horario: 'L-V 9:00-20:00', googleQuery: 'Farmacia Guadassuar' },
    { id: 'gu_s1', name: 'Consum Guadassuar',        category: 'super', lat: 39.1750, lng: -0.4020, address: 'C/ de Valencia, 15, Guadassuar', horario: 'L-S 9:00-21:00', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Consum_Supermercat_Algemesi.jpg/640px-Consum_Supermercat_Algemesi.jpg', googleQuery: 'Consum Guadassuar' },
    { id: 'gu_h1', name: 'Consultorio Guadassuar',       category: 'salud', lat: 39.1742, lng: -0.4015, address: 'C/ Sant Vicent, 3, Guadassuar', phone: '962 57 00 50', googleQuery: 'Consultorio Guadassuar' },
    { id: 'gu_c1', name: 'Bar La Plaça Guadassuar',  category: 'cafe', lat: 39.1748, lng: -0.4008, address: 'Plaça Major, 2, Guadassuar', horario: 'L-D 7:00-22:00', googleQuery: 'Bar Plaça Guadassuar' },
    { id: 'gu_r1', name: 'Restaurante El Xúquer',    category: 'restaurante', lat: 39.1755, lng: -0.4025, address: 'Ctra. Alzira-Guadassuar', horario: 'L-S 13:00-16:00', description: 'Paellas y arroces en leña', googleQuery: 'Restaurante Xuquer Guadassuar' },
    { id: 'gu_b1', name: 'Forn de Pa Guadassuar',    category: 'panaderia', lat: 39.1740, lng: -0.4005, address: 'C/ Major, 12, Guadassuar', horario: 'L-S 7:00-14:00', googleQuery: 'Forn Pa Guadassuar' },
    { id: 'gu_p1', name: 'Parc Municipal Guadassuar', category: 'parque', lat: 39.1752, lng: -0.4000, address: 'Centre, Guadassuar', description: 'Parque con pista deportiva y zona de juegos', googleQuery: 'Parc Guadassuar' },
    { id: 'gu_m1', name: 'Iglesia de Sant Vicent',       category: 'monumento', lat: 39.1746, lng: -0.4012, address: 'Plaça Major, Guadassuar', description: 'Iglesia parroquial del s.XVI', googleQuery: 'Iglesia Sant Vicent Guadassuar' },
    { id: 'bm_f1', name: 'Farmacia Benimodo',            category: 'farmacia', lat: 39.1830, lng: -0.4100, address: 'C/ Major, 3, Benimodo', horario: 'L-V 9:00-14:00', googleQuery: 'Farmacia Benimodo' },
    { id: 'bm_s1', name: 'Tienda Benimodo',          category: 'super', lat: 39.1835, lng: -0.4095, address: 'C/ de la Font, 5, Benimodo', horario: 'L-S 8:00-14:00, 17:00-20:00', googleQuery: 'Tienda Benimodo' },
    { id: 'bm_c1', name: 'Bar La Plaça Benimodo',    category: 'cafe', lat: 39.1828, lng: -0.4105, address: 'Plaça Major, 1, Benimodo', horario: 'L-D 7:00-22:00', googleQuery: 'Bar Plaça Benimodo' },
    { id: 'bm_r1', name: 'Restaurante El Tio Pepe',  category: 'restaurante', lat: 39.1838, lng: -0.4090, address: 'C/ Sant Roc, 8, Benimodo', horario: 'V-D 13:00-16:00', description: 'Cocina casera de pueblo', googleQuery: 'Restaurante Tio Pepe Benimodo' },
    { id: 'bm_p1', name: 'Plaza Mayor Benimodo',     category: 'parque', lat: 39.1832, lng: -0.4098, address: 'Centre, Benimodo', description: 'Plaza del pueblo con fuente y árboles', googleQuery: 'Plaza Mayor Benimodo' },
    { id: 'bm_m1', name: 'Iglesia de Benimodo',          category: 'monumento', lat: 39.1833, lng: -0.4102, address: 'Plaça Major, Benimodo', description: 'Iglesia parroquial del s.XVIII', googleQuery: 'Iglesia Benimodo' },
    { id: 'pl_f1', name: 'Farmacia La Pobla Llarga',     category: 'farmacia', lat: 39.1310, lng: -0.4798, address: 'C/ Major, 10, La Pobla Llarga', horario: 'L-V 9:00-20:00', googleQuery: 'Farmacia Pobla Llarga' },
    { id: 'pl_s1', name: 'Consum La Pobla Llarga',   category: 'super', lat: 39.1315, lng: -0.4790, address: 'Av. del País Valencià, La Pobla Llarga', horario: 'L-S 9:00-21:00', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Consum_Supermercat_Algemesi.jpg/640px-Consum_Supermercat_Algemesi.jpg', googleQuery: 'Consum Pobla Llarga' },
    { id: 'pl_c1', name: 'Bar La Pobla',             category: 'cafe', lat: 39.1305, lng: -0.4802, address: 'Plaça Major, La Pobla Llarga', horario: 'L-D 7:00-21:00', googleQuery: 'Bar Pobla Llarga' },
    { id: 'pl_r1', name: 'Restaurante El Forn',      category: 'restaurante', lat: 39.1318, lng: -0.4785, address: 'C/ de Valencia, 20, La Pobla Llarga', horario: 'L-S 13:00-16:00', googleQuery: 'Restaurante Forn Pobla Llarga' },
    { id: 'pl_p1', name: 'Parc de la Pobla',         category: 'parque', lat: 39.1322, lng: -0.4795, address: 'Centre, La Pobla Llarga', description: 'Jardines del pueblo con zona recreativa', googleQuery: 'Parc Pobla Llarga' },
    { id: 'pl_m1', name: 'Iglesia de la Pobla Llarga',   category: 'monumento', lat: 39.1308, lng: -0.4800, address: 'Plaça Major, La Pobla Llarga', description: 'Iglesia parroquial del s.XVI', googleQuery: 'Iglesia Pobla Llarga' },
];

// Fallback images per category (for POIs without a specific photo)
const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
    farmacia:    'https://images.unsplash.com/photo-1576602976047-174e57a47881?w=400&h=250&fit=crop',
    super:       'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=400&h=250&fit=crop',
    parque:      'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=400&h=250&fit=crop',
    salud:       'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=400&h=250&fit=crop',
    cafe:        'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=250&fit=crop',
    panaderia:   'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=250&fit=crop',
    restaurante: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=250&fit=crop',
    monumento:   'https://images.unsplash.com/photo-1548625149-fc4a29cf7092?w=400&h=250&fit=crop',
};

// Patient home location
const HOME_LAT = 39.1512;
const HOME_LNG = -0.4323;

const MapaZonaScreen: React.FC = () => {
    const { colors, isDark } = useTheme();
    const [activeCategories, setActiveCategories] = useState<Set<string>>(new Set(CATEGORIES.map(c => c.id)));
    const [selectedPOI, setSelectedPOI] = useState<POI | null>(null);
    const [mapLoading, setMapLoading] = useState(true);
    const [routeInfo, setRouteInfo] = useState<{ duration: number; distance: string } | null>(null);
    const [visibleCount, setVisibleCount] = useState<number>(0);
    const [nearbyCount, setNearbyCount] = useState<number>(0);
    const [showAllPOIs, setShowAllPOIs] = useState(false);
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [gpsReady, setGpsReady] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [searchFocused, setSearchFocused] = useState(false);
    const webViewRef = useRef<WebView>(null);
    const slideAnim = useRef(new Animated.Value(400)).current;

    // ─── GPS: get current location and start watching ───
    useEffect(() => {
        let subscription: Location.LocationSubscription | null = null;

        (async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    console.warn('Location permission denied');
                    return;
                }

                // Get initial GPS position
                const loc = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.High,
                });
                const initial = { lat: loc.coords.latitude, lng: loc.coords.longitude };
                setUserLocation(initial);
                setGpsReady(true);

                // Inject initial position into WebView
                webViewRef.current?.injectJavaScript(
                    `updateUserLocation(${initial.lat}, ${initial.lng}); true;`
                );

                // Watch position updates
                subscription = await Location.watchPositionAsync(
                    {
                        accuracy: Location.Accuracy.High,
                        timeInterval: 5000,
                        distanceInterval: 5,
                    },
                    (newLoc) => {
                        const pos = { lat: newLoc.coords.latitude, lng: newLoc.coords.longitude };
                        setUserLocation(pos);
                        webViewRef.current?.injectJavaScript(
                            `updateUserLocation(${pos.lat}, ${pos.lng}); true;`
                        );
                    }
                );
            } catch (error) {
                console.error('Error GPS:', error);
                // Fallback: use home location as fake GPS
                const fallback = { lat: HOME_LAT + 0.001, lng: HOME_LNG - 0.002 };
                setUserLocation(fallback);
                setGpsReady(true);
                webViewRef.current?.injectJavaScript(
                    `updateUserLocation(${fallback.lat}, ${fallback.lng}); true;`
                );
            }
        })();

        return () => {
            if (subscription) subscription.remove();
        };
    }, []);

    const toggleCategory = useCallback((catId: string) => {
        setActiveCategories(prev => {
            const next = new Set(prev);
            if (next.has(catId)) {
                next.delete(catId);
            } else {
                next.add(catId);
            }
            webViewRef.current?.injectJavaScript(`
                toggleCategory('${catId}', ${!prev.has(catId)});
                true;
            `);
            return next;
        });
    }, []);

    const showAllCategories = useCallback(() => {
        const allIds = new Set(CATEGORIES.map(c => c.id));
        setActiveCategories(allIds);
        webViewRef.current?.injectJavaScript(`showAllCategories(); true;`);
    }, []);

    // Show POI card animation
    const showPOICard = useCallback((poi: POI) => {
        setSelectedPOI(poi);
        setRouteInfo(null);
        slideAnim.setValue(400);
        Animated.spring(slideAnim, {
            toValue: 0,
            friction: 8,
            tension: 65,
            useNativeDriver: true,
        }).start();
    }, [slideAnim]);

    const hidePOICard = useCallback(() => {
        Animated.timing(slideAnim, {
            toValue: 400,
            duration: 200,
            useNativeDriver: true,
        }).start(() => {
            setSelectedPOI(null);
            setRouteInfo(null);
        });
        webViewRef.current?.injectJavaScript(`clearRoute(); true;`);
    }, [slideAnim]);

    // Handle messages from WebView
    const onWebViewMessage = useCallback((event: any) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'poi_clicked') {
                const poi = LOCAL_POIS.find(p => p.id === data.id);
                if (poi) showPOICard(poi);
            } else if (data.type === 'map_clicked') {
                hidePOICard();
            } else if (data.type === 'route_info') {
                setRouteInfo({ duration: data.duration, distance: data.distance });
            } else if (data.type === 'visible_count') {
                setVisibleCount(data.count);
            } else if (data.type === 'nearby_count') {
                setNearbyCount(data.count);
            }
        } catch (e) {
            console.warn('WebView message error:', e);
        }
    }, [showPOICard, hidePOICard]);

    // Open Google Maps for real photos and navigation
    const openGoogleMapsPhotos = useCallback((poi: POI) => {
        const query = poi.googleQuery || `${poi.name}, Alzira, Valencia`;
        const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
        Linking.openURL(url);
    }, []);

    // Open external maps for turn-by-turn navigation from current position
    const openDirections = useCallback((lat: number, lng: number) => {
        const originLat = userLocation?.lat || HOME_LAT;
        const originLng = userLocation?.lng || HOME_LNG;
        const url = Platform.OS === 'ios'
            ? `maps://app?saddr=${originLat},${originLng}&daddr=${lat},${lng}&dirflg=w`
            : `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${lat},${lng}&travelmode=walking`;
        Linking.openURL(url);
    }, [userLocation]);

    const getCategory = (catId: string) => CATEGORIES.find(c => c.id === catId);
    const getCategoryColor = (catId: string) => getCategory(catId)?.color || '#666';

    const getMapHtml = () => {
        const poisJson = JSON.stringify(LOCAL_POIS);
        const catsJson = JSON.stringify(CATEGORIES.map(c => ({ id: c.id, emoji: c.emoji, color: c.color, label: c.label })));
        const catFallbackJson = JSON.stringify(CATEGORY_FALLBACK_IMAGES);
        const tileUrl = isDark
            ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
            : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
            <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
            <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css" />
            <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css" />
            <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
            <script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"></script>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                html, body, #map { width: 100%; height: 100%; }
                
                /* ─── Teardrop pin markers ─── */
                .poi-pin-wrap {
                    display: flex; flex-direction: column; align-items: center;
                    cursor: pointer;
                    animation: markerDrop 0.4s cubic-bezier(.34,1.56,.64,1) both;
                    transition: transform 0.2s cubic-bezier(.34,1.56,.64,1);
                    filter: drop-shadow(0 4px 6px rgba(0,0,0,0.35));
                }
                .poi-pin-wrap:hover { transform: scale(1.15) translateY(-4px); }
                .poi-pin {
                    width: 36px; height: 36px; border-radius: 50% 50% 50% 0;
                    transform: rotate(-45deg);
                    display: flex; align-items: center; justify-content: center;
                    border: 2.5px solid white;
                    position: relative;
                }
                .poi-pin-emoji {
                    transform: rotate(45deg);
                    font-size: 17px;
                    line-height: 1;
                }
                .poi-pin-label {
                    margin-top: 2px;
                    background: rgba(0,0,0,0.7);
                    color: #fff;
                    font-size: 9px;
                    font-weight: 700;
                    padding: 2px 6px;
                    border-radius: 6px;
                    white-space: nowrap;
                    max-width: 90px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    letter-spacing: 0.2px;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                    backdrop-filter: blur(4px);
                }
                
                @keyframes markerDrop {
                    0% { transform: translateY(-30px) scale(0.3); opacity: 0; }
                    60% { transform: translateY(2px) scale(1.05); opacity: 1; }
                    100% { transform: translateY(0) scale(1); opacity: 1; }
                }
                
                .home-marker {
                    width: 52px; height: 52px; border-radius: 50%;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    display: flex; align-items: center; justify-content: center;
                    font-size: 24px; border: 4px solid white;
                    box-shadow: 0 6px 20px rgba(102,126,234,0.5);
                    animation: homePulse 2.5s ease-in-out infinite;
                    position: relative;
                }
                .home-marker::after {
                    content: '';
                    position: absolute;
                    width: 100%; height: 100%;
                    border-radius: 50%;
                    border: 2px solid rgba(102,126,234,0.3);
                    animation: homeRing 2.5s ease-out infinite;
                }
                
                @keyframes homePulse {
                    0%, 100% { box-shadow: 0 6px 20px rgba(102,126,234,0.5); transform: scale(1); }
                    50% { box-shadow: 0 6px 30px rgba(102,126,234,0.8), 0 0 0 10px rgba(102,126,234,0.1); transform: scale(1.03); }
                }
                @keyframes homeRing {
                    0% { transform: scale(1); opacity: 0.6; }
                    100% { transform: scale(2.2); opacity: 0; }
                }
                
                /* ─── Blue GPS dot ─── */
                .user-dot-outer {
                    width: 48px; height: 48px; border-radius: 50%;
                    background: radial-gradient(circle, rgba(33,150,243,0.2) 0%, rgba(33,150,243,0.05) 70%);
                    display: flex; align-items: center; justify-content: center;
                    animation: gpsPulse 2s ease-out infinite;
                    position: relative;
                }
                .user-dot-outer::after {
                    content: '';
                    position: absolute;
                    width: 100%; height: 100%;
                    border-radius: 50%;
                    border: 2px solid rgba(33,150,243,0.25);
                    animation: gpsRing 2s ease-out infinite;
                }
                .user-dot-inner {
                    width: 18px; height: 18px; border-radius: 50%;
                    background: linear-gradient(135deg, #42A5F5 0%, #1976D2 100%);
                    border: 3px solid white;
                    box-shadow: 0 2px 10px rgba(33,150,243,0.6);
                }
                @keyframes gpsPulse {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.2); opacity: 0.8; }
                    100% { transform: scale(1); opacity: 1; }
                }
                @keyframes gpsRing {
                    0% { transform: scale(1); opacity: 0.5; }
                    100% { transform: scale(2.5); opacity: 0; }
                }
                
                /* ─── Enhanced popup with photo ─── */
                .leaflet-popup-content-wrapper {
                    border-radius: 18px !important;
                    box-shadow: 0 12px 40px rgba(0,0,0,${isDark ? '0.5' : '0.18'}) !important;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                    padding: 0 !important;
                    overflow: hidden;
                    background: ${isDark ? '#1e1e2e' : '#ffffff'} !important;
                    border: 1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'};
                    backdrop-filter: blur(20px);
                }
                .leaflet-popup-content {
                    margin: 0 !important;
                    width: 270px !important;
                }
                .leaflet-popup-tip {
                    box-shadow: 0 4px 12px rgba(0,0,0,${isDark ? '0.4' : '0.15'});
                    background: ${isDark ? '#1e1e2e' : '#ffffff'} !important;
                }
                .leaflet-popup-close-button {
                    color: ${isDark ? '#aaa' : '#666'} !important;
                    font-size: 22px !important;
                    top: 6px !important; right: 8px !important;
                    z-index: 10;
                    background: ${isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.8)'} !important;
                    border-radius: 50% !important;
                    width: 28px !important; height: 28px !important;
                    display: flex; align-items: center; justify-content: center;
                    line-height: 28px !important;
                    backdrop-filter: blur(10px);
                }
                .poi-popup { width: 270px; }
                .popup-photo {
                    width: 100%; height: 160px; object-fit: cover;
                    display: block; background: ${isDark ? '#2a2a3a' : '#e0e0e0'};
                }
                .popup-photo-placeholder {
                    width: 100%; height: 160px; display: flex;
                    align-items: center; justify-content: center;
                    background: ${isDark
                        ? 'linear-gradient(135deg, #1a1a2e 0%, #2d2d44 100%)'
                        : 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'};
                    font-size: 52px;
                }
                .popup-cat-bar {
                    height: 4px; width: 100%;
                }
                .popup-info { padding: 14px 16px 16px; }
                .popup-header {
                    display: flex; align-items: center; gap: 8px;
                    margin-bottom: 6px;
                }
                .popup-cat-badge {
                    font-size: 18px;
                    width: 32px; height: 32px;
                    border-radius: 10px;
                    display: flex; align-items: center; justify-content: center;
                    flex-shrink: 0;
                }
                .popup-name {
                    font-weight: 800; font-size: 15px;
                    color: ${isDark ? '#f0f0f5' : '#1a1a2e'};
                    letter-spacing: -0.2px;
                    flex: 1;
                }
                .popup-dist-badge {
                    font-size: 10px; font-weight: 700;
                    padding: 3px 8px; border-radius: 8px;
                    color: white;
                    white-space: nowrap;
                }
                .popup-address {
                    color: ${isDark ? '#a0a0b0' : '#666'}; font-size: 12px; line-height: 1.7;
                }
                .popup-desc {
                    color: ${isDark ? '#8888aa' : '#555'}; font-size: 11px; font-style: italic;
                    line-height: 1.5; margin-top: 5px;
                }
                .popup-btns { display: flex; gap: 8px; margin-top: 12px; }
                .popup-btn {
                    flex: 1; padding: 10px 8px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none; border-radius: 12px; font-size: 12px;
                    font-weight: 700; cursor: pointer; text-align: center;
                    letter-spacing: 0.3px;
                    transition: transform 0.15s, opacity 0.15s;
                }
                .popup-btn:active { opacity: 0.85; transform: scale(0.97); }
                .popup-btn-green { background: linear-gradient(135deg, #34A853 0%, #2E7D32 100%); }
                
                /* ─── Tooltip (on hover) ─── */
                .poi-tooltip {
                    background: ${isDark ? 'rgba(30,30,46,0.92)' : 'rgba(255,255,255,0.95)'} !important;
                    color: ${isDark ? '#f0f0f5' : '#1a1a2e'} !important;
                    border: 1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'} !important;
                    border-radius: 10px !important;
                    font-size: 12px !important;
                    font-weight: 700 !important;
                    padding: 5px 10px !important;
                    box-shadow: 0 4px 14px rgba(0,0,0,0.2) !important;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
                    backdrop-filter: blur(10px);
                    letter-spacing: -0.1px;
                }
                .poi-tooltip::before {
                    border-top-color: ${isDark ? 'rgba(30,30,46,0.92)' : 'rgba(255,255,255,0.95)'} !important;
                }
                
                .leaflet-control-zoom { display: none; }
                .leaflet-control-attribution {
                    background: ${isDark ? 'rgba(30,30,46,0.7)' : 'rgba(255,255,255,0.7)'} !important;
                    color: ${isDark ? '#888' : '#999'} !important;
                    font-size: 9px !important;
                    border-radius: 8px 0 0 0 !important;
                    padding: 3px 8px !important;
                    backdrop-filter: blur(8px);
                }
                .leaflet-control-attribution a {
                    color: ${isDark ? '#aaa' : '#777'} !important;
                }

                /* ─── Custom cluster icons ─── */
                .marker-cluster-custom {
                    border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    font-weight: 800; color: white; font-size: 13px;
                    border: 3px solid rgba(255,255,255,0.95);
                    box-shadow: 0 4px 16px rgba(0,0,0,0.3);
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                    transition: transform 0.2s;
                    animation: clusterPop 0.3s cubic-bezier(.34,1.56,.64,1) both;
                    filter: drop-shadow(0 3px 6px rgba(0,0,0,0.25));
                }
                .marker-cluster-custom:hover { transform: scale(1.12); }
                @keyframes clusterPop {
                    0% { transform: scale(0); }
                    100% { transform: scale(1); }
                }
                .cluster-inner {
                    display: flex; flex-direction: column; align-items: center; justify-content: center;
                    width: 100%; height: 100%; border-radius: 50%; gap: 0;
                }
                .cluster-emoji { font-size: 14px; line-height: 1; margin-top: 2px; }
                .cluster-count { font-size: 11px; font-weight: 900; line-height: 1; text-shadow: 0 1px 2px rgba(0,0,0,0.4); }
                .marker-cluster-small {
                    width: 42px !important; height: 42px !important;
                    line-height: 42px !important; margin-left: -21px !important; margin-top: -21px !important;
                }
                .marker-cluster-medium {
                    width: 50px !important; height: 50px !important;
                    line-height: 50px !important; margin-left: -25px !important; margin-top: -25px !important;
                }
                .marker-cluster-large {
                    width: 58px !important; height: 58px !important;
                    line-height: 58px !important; margin-left: -29px !important; margin-top: -29px !important;
                }
                .marker-cluster-large .cluster-emoji { font-size: 16px; }
                .marker-cluster-large .cluster-count { font-size: 13px; }
            </style>
        </head>
        <body>
            <div id="map"></div>
            <script>
                var HOME_LAT = ${HOME_LAT};
                var HOME_LNG = ${HOME_LNG};
                var userLat = null;
                var userLng = null;
                var userMarker = null;
                var userAccuracyCircle = null;
                
                var map = L.map('map', {
                    zoomControl: false,
                    attributionControl: false,
                }).setView([HOME_LAT, HOME_LNG], 15);
                
                L.tileLayer('${tileUrl}', { maxZoom: 19 }).addTo(map);
                
                L.control.attribution({ position: 'bottomright', prefix: false })
                    .addAttribution('© <a href="https://carto.com">CARTO</a> © <a href="https://osm.org">OSM</a>')
                    .addTo(map);
                
                // ─── HOME MARKER ───
                var homeIcon = L.divIcon({
                    className: '',
                    html: '<div class="home-marker">🏠</div>',
                    iconSize: [52, 52],
                    iconAnchor: [26, 26],
                });
                L.marker([HOME_LAT, HOME_LNG], { icon: homeIcon, zIndexOffset: 1000 })
                    .addTo(map)
                    .bindPopup('<div class="popup-info"><div class="popup-name">🏠 Domicilio de Carmen</div><div class="popup-address">📍 C/Colmenar 59, Alzira</div></div>');
                
                // Home radius circle (500m)
                L.circle([HOME_LAT, HOME_LNG], {
                    radius: 500,
                    color: '#667eea',
                    fillColor: '#667eea',
                    fillOpacity: ${isDark ? '0.08' : '0.05'},
                    weight: 2,
                    dashArray: '8 6',
                    opacity: 0.6,
                }).addTo(map);
                
                // ─── GPS BLUE DOT ─── (updated via updateUserLocation)
                var userDotIcon = L.divIcon({
                    className: '',
                    html: '<div class="user-dot-outer"><div class="user-dot-inner"></div></div>',
                    iconSize: [44, 44],
                    iconAnchor: [22, 22],
                });
                
                function updateUserLocation(lat, lng) {
                    userLat = lat;
                    userLng = lng;
                    
                    if (!userMarker) {
                        // Create GPS dot for the first time
                        userMarker = L.marker([lat, lng], {
                            icon: userDotIcon,
                            zIndexOffset: 2000,
                        }).addTo(map);
                        userMarker.bindPopup('<div class="popup-info"><div class="popup-name">📍 Tu ubicación actual</div></div>');
                        
                        // Accuracy circle
                        userAccuracyCircle = L.circle([lat, lng], {
                            radius: 30,
                            color: '#2196F3',
                            fillColor: '#2196F3',
                            fillOpacity: 0.08,
                            weight: 1,
                            interactive: false,
                        }).addTo(map);
                    } else {
                        // Update existing marker position smoothly
                        userMarker.setLatLng([lat, lng]);
                        userAccuracyCircle.setLatLng([lat, lng]);
                    }
                    // Refresh which POIs are nearby
                    refreshVisiblePOIs();
                }
                
                // ─── POI DATA ───
                var pois = ${poisJson};
                var cats = ${catsJson};
                var catFallback = ${catFallbackJson};
                var catMap = {};
                cats.forEach(function(c) { catMap[c.id] = c; });

                // ─── PROXIMITY MODE ───
                var NEARBY_RADIUS = 600; // meters
                var showAllMode = false;
                var allMarkers = []; // {poi, marker, category}
                var activeCats = {};
                cats.forEach(function(c) { activeCats[c.id] = true; });

                function haversineDistance(lat1, lng1, lat2, lng2) {
                    var R = 6371000;
                    var dLat = (lat2 - lat1) * Math.PI / 180;
                    var dLng = (lng2 - lng1) * Math.PI / 180;
                    var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                        Math.sin(dLng/2) * Math.sin(dLng/2);
                    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                }

                function refreshVisiblePOIs() {
                    var refLat = userLat || HOME_LAT;
                    var refLng = userLng || HOME_LNG;
                    var nearbyN = 0;

                    allMarkers.forEach(function(item) {
                        var dist = haversineDistance(refLat, refLng, item.poi.lat, item.poi.lng);
                        var isNearby = dist <= NEARBY_RADIUS;
                        var catOn = activeCats[item.poi.category];
                        var shouldShow = catOn && (showAllMode || isNearby);

                        if (isNearby && catOn) nearbyN++;

                        if (shouldShow && !item.visible) {
                            markerGroups[item.poi.category].addLayer(item.marker);
                            item.visible = true;
                        } else if (!shouldShow && item.visible) {
                            markerGroups[item.poi.category].removeLayer(item.marker);
                            item.visible = false;
                        }
                    });

                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'nearby_count',
                        count: nearbyN,
                    }));
                }

                function setShowAll(val) {
                    showAllMode = val;
                    refreshVisiblePOIs();
                }

                var markerGroups = {};
                cats.forEach(function(c) {
                    markerGroups[c.id] = L.markerClusterGroup({
                        maxClusterRadius: 45,
                        spiderfyOnMaxZoom: true,
                        showCoverageOnHover: false,
                        zoomToBoundsOnClick: true,
                        disableClusteringAtZoom: 16,
                        animate: true,
                        animateAddingMarkers: false,
                        iconCreateFunction: function(cluster) {
                            var count = cluster.getChildCount();
                            var size = count < 5 ? 'small' : count < 15 ? 'medium' : 'large';
                            return L.divIcon({
                                html: '<div class="cluster-inner" style="background:' + c.color + ';border-radius:50%;"><span class="cluster-emoji">' + c.emoji + '</span><span class="cluster-count">' + count + '</span></div>',
                                className: 'marker-cluster-custom marker-cluster-' + size,
                                iconSize: L.point(44, 44),
                            });
                        },
                    });
                    map.addLayer(markerGroups[c.id]);
                });
                
                // ─── CREATE POI MARKERS WITH PHOTO POPUPS ───
                var markerIndex = 0;
                pois.forEach(function(poi) {
                    var cat = catMap[poi.category];
                    if (!cat) return;
                    
                    var delay = Math.min(markerIndex * 30, 600);
                    // Truncate name for label (max ~12 chars)
                    var shortName = poi.name.length > 14 ? poi.name.substring(0, 12) + '…' : poi.name;
                    var icon = L.divIcon({
                        className: '',
                        html: '<div class="poi-pin-wrap" style="animation-delay:' + delay + 'ms;"><div class="poi-pin" style="background:' + cat.color + ';"><span class="poi-pin-emoji">' + cat.emoji + '</span></div><div class="poi-pin-label">' + shortName + '</div></div>',
                        iconSize: [42, 52],
                        iconAnchor: [21, 44],
                    });
                    markerIndex++;
                    
                    // Image: use specific photo > category fallback
                    var imgUrl = poi.image || catFallback[poi.category] || '';
                    var photoHtml = imgUrl
                        ? '<img src="' + imgUrl + '" class="popup-photo" onerror="this.outerHTML=\\'<div class=popup-photo-placeholder>' + cat.emoji + '</div>\\';" />'
                        : '<div class="popup-photo-placeholder">' + cat.emoji + '</div>';
                    
                    // Google Maps URL for real photos
                    var googleQuery = poi.googleQuery || (poi.name + ', Alzira, Valencia');
                    var googleUrl = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(googleQuery);
                    
                    // Distance from user/home
                    var refLat2 = userLat || HOME_LAT;
                    var refLng2 = userLng || HOME_LNG;
                    var distM = haversineDistance(refLat2, refLng2, poi.lat, poi.lng);
                    var distLabel = distM < 1000 ? Math.round(distM) + 'm' : (distM / 1000).toFixed(1) + 'km';
                    
                    var popupHtml = '<div class="poi-popup">' +
                        photoHtml +
                        '<div class="popup-cat-bar" style="background:' + cat.color + ';"></div>' +
                        '<div class="popup-info">' +
                        '<div class="popup-header">' +
                        '<div class="popup-cat-badge" style="background:' + cat.color + '22;">' + cat.emoji + '</div>' +
                        '<div class="popup-name">' + poi.name + '</div>' +
                        '<div class="popup-dist-badge" style="background:' + cat.color + ';">' + distLabel + '</div>' +
                        '</div>' +
                        (poi.address ? '<div class="popup-address">📍 ' + poi.address + '</div>' : '') +
                        (poi.horario ? '<div class="popup-address">🕐 ' + poi.horario + '</div>' : '') +
                        (poi.description ? '<div class="popup-desc">' + poi.description + '</div>' : '') +
                        '<div class="popup-btns">' +
                        '<button class="popup-btn" onclick="event.stopPropagation(); handleRoute(' + poi.lat + ',' + poi.lng + ')">🚶 Cómo llegar</button>' +
                        '<a href="' + googleUrl + '" target="_blank" class="popup-btn popup-btn-green" style="text-decoration:none;display:flex;align-items:center;justify-content:center;">📸 Ver fotos</a>' +
                        '</div>' +
                        '</div></div>';
                    
                    var marker = L.marker([poi.lat, poi.lng], { icon: icon });
                    marker.on('click', function() {
                        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'poi_clicked', id: poi.id }));
                    });
                    marker.bindPopup(popupHtml, { maxWidth: 290, closeButton: true });
                    marker.bindTooltip(cat.emoji + ' ' + poi.name, {
                        direction: 'top',
                        offset: [0, -44],
                        className: 'poi-tooltip',
                    });

                    // Don't add to map yet — proximity logic decides
                    allMarkers.push({ poi: poi, marker: marker, visible: false });
                });

                // Initial refresh — show only nearby
                refreshVisiblePOIs();
                
                // ─── ROUTING VIA OSRM (from user location or home) ───
                var currentRoute = null;
                
                function handleRoute(lat, lng) {
                    map.closePopup();
                    drawRoute(lat, lng);
                }
                
                function drawRoute(destLat, destLng) {
                    // Remove previous route
                    if (currentRoute) { map.removeLayer(currentRoute); currentRoute = null; }
                    
                    // Origin: user GPS if available, otherwise home
                    var origLat = userLat || HOME_LAT;
                    var origLng = userLng || HOME_LNG;
                    
                    // Use OSRM with steps for real walking directions
                    var url = 'https://router.project-osrm.org/route/v1/foot/' +
                        origLng + ',' + origLat + ';' + destLng + ',' + destLat +
                        '?overview=full&geometries=geojson&steps=true&alternatives=true';
                    
                    fetch(url)
                        .then(function(r) { return r.json(); })
                        .then(function(data) {
                            if (!data.routes || !data.routes[0]) return;
                            
                            var route = data.routes[0];
                            currentRoute = L.layerGroup();
                            
                            // Shadow line
                            L.geoJSON(route.geometry, {
                                style: { color: 'rgba(0,0,0,0.12)', weight: 11, lineCap: 'round', lineJoin: 'round' }
                            }).addTo(currentRoute);
                            
                            // Main route line
                            L.geoJSON(route.geometry, {
                                style: { color: '#4285F4', weight: 6, opacity: 0.95, lineCap: 'round', lineJoin: 'round' }
                            }).addTo(currentRoute);
                            
                            // Dotted white center line for walking
                            L.geoJSON(route.geometry, {
                                style: { color: 'white', weight: 2, opacity: 0.6, dashArray: '6 10', lineCap: 'round', lineJoin: 'round' }
                            }).addTo(currentRoute);
                            
                            // Turn-by-turn markers at every instruction step
                            if (route.legs && route.legs[0] && route.legs[0].steps) {
                                route.legs[0].steps.forEach(function(step, index) {
                                    if (index === 0 || index === route.legs[0].steps.length - 1) return;
                                    
                                    var coords = step.maneuver.location;
                                    var turnType = step.maneuver.type;
                                    var modifier = step.maneuver.modifier || '';
                                    
                                    // Only show turn markers at significant points
                                    if (turnType === 'turn' || turnType === 'end of road' || turnType === 'fork' || turnType === 'roundabout') {
                                        var arrow = '↗';
                                        if (modifier.indexOf('left') >= 0) arrow = '↰';
                                        else if (modifier.indexOf('right') >= 0) arrow = '↱';
                                        else if (modifier.indexOf('straight') >= 0) arrow = '↑';
                                        else if (turnType === 'roundabout') arrow = '↻';
                                        
                                        var turnIcon = L.divIcon({
                                            className: '',
                                            html: '<div style="background:white;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid #4285F4;font-size:13px;box-shadow:0 2px 6px rgba(0,0,0,0.25);">' + arrow + '</div>',
                                            iconSize: [22, 22],
                                            iconAnchor: [11, 11],
                                        });
                                        L.marker([coords[1], coords[0]], { icon: turnIcon, zIndexOffset: 800 }).addTo(currentRoute);
                                    }
                                });
                            }
                            
                            // Origin marker (you are here)
                            var startIcon = L.divIcon({
                                className: '',
                                html: '<div style="background:#4285F4;color:white;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;font-size:14px;font-weight:bold;box-shadow:0 3px 10px rgba(66,133,244,0.5);">TÚ</div>',
                                iconSize: [32, 32],
                                iconAnchor: [16, 16],
                            });
                            L.marker([origLat, origLng], { icon: startIcon, zIndexOffset: 900 }).addTo(currentRoute);
                            
                            // Destination marker
                            var endIcon = L.divIcon({
                                className: '',
                                html: '<div style="background:#EA4335;color:white;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;font-size:15px;box-shadow:0 3px 10px rgba(234,67,53,0.5);">📍</div>',
                                iconSize: [32, 32],
                                iconAnchor: [16, 16],
                            });
                            L.marker([destLat, destLng], { icon: endIcon, zIndexOffset: 900 }).addTo(currentRoute);
                            
                            currentRoute.addTo(map);
                            
                            // Fit bounds to show entire route
                            var coords = route.geometry.coordinates.map(function(c) { return [c[1], c[0]]; });
                            map.fitBounds(L.latLngBounds(coords).pad(0.15));
                            
                            // Send route info back to React Native
                            var mins = Math.round(route.duration / 60);
                            var km = (route.distance / 1000).toFixed(1);
                            window.ReactNativeWebView.postMessage(JSON.stringify({
                                type: 'route_info',
                                duration: mins,
                                distance: km,
                            }));
                        })
                        .catch(function(e) {
                            console.error('Route error:', e);
                        });
                }
                
                function clearRoute() {
                    if (currentRoute) {
                        map.removeLayer(currentRoute);
                        currentRoute = null;
                    }
                }
                
                // ─── CATEGORY CONTROLS ───
                function toggleCategory(catId, show) {
                    activeCats[catId] = show;
                    if (!show) map.removeLayer(markerGroups[catId]);
                    else map.addLayer(markerGroups[catId]);
                    refreshVisiblePOIs();
                }
                
                function showAllCategories() {
                    Object.keys(markerGroups).forEach(function(catId) {
                        activeCats[catId] = true;
                        map.addLayer(markerGroups[catId]);
                    });
                    refreshVisiblePOIs();
                }
                
                function focusPOI(lat, lng) {
                    map.flyTo([lat, lng], 17, { duration: 0.8 });
                }
                
                function centerOnUser() {
                    if (userLat && userLng) {
                        map.flyTo([userLat, userLng], 16, { duration: 0.8 });
                    }
                }
                
                function resetView() {
                    clearRoute();
                    map.flyTo([HOME_LAT, HOME_LNG], 15, { duration: 0.8 });
                }

                function showAllAlzira() {
                    clearRoute();
                    // Fit all POIs dynamically
                    var lats = pois.map(function(p) { return p.lat; });
                    var lngs = pois.map(function(p) { return p.lng; });
                    map.flyToBounds([
                        [Math.min.apply(null, lats) - 0.005, Math.min.apply(null, lngs) - 0.005],
                        [Math.max.apply(null, lats) + 0.005, Math.max.apply(null, lngs) + 0.005]
                    ], { padding: [20, 20], duration: 1.0 });
                }
                
                // ─── DYNAMIC: count visible POIs on map move ───
                map.on('moveend', function() {
                    var bounds = map.getBounds();
                    var count = 0;
                    pois.forEach(function(p) {
                        if (bounds.contains([p.lat, p.lng])) count++;
                    });
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'visible_count',
                        count: count,
                    }));
                });
                
                // ─── Show/hide labels based on zoom level ───
                function updateLabelVisibility() {
                    var zoom = map.getZoom();
                    var labels = document.querySelectorAll('.poi-pin-label');
                    var display = zoom >= 15 ? 'block' : 'none';
                    for (var i = 0; i < labels.length; i++) {
                        labels[i].style.display = display;
                    }
                }
                map.on('zoomend', updateLabelVisibility);
                updateLabelVisibility();
                
                // Click on map background → close card
                map.on('click', function() {
                    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'map_clicked' }));
                });
            </script>
        </body>
        </html>
        `;
    };

    const activePOIs = LOCAL_POIS.filter(p => activeCategories.has(p.category));
    const activeCount = activePOIs.length;

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: isDark ? colors.card : colors.primary }]}>
                <View style={styles.headerTop}>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.title, { color: isDark ? colors.text : '#FFF' }]}>
                            🗺️ Mapa de la Ribera
                        </Text>
                        <Text style={[styles.subtitle, { color: isDark ? colors.textSecondary : 'rgba(255,255,255,0.8)' }]}>
                            {showAllPOIs
                                ? `📍 ${visibleCount} de ${LOCAL_POIS.length} lugares en toda la comarca`
                                : `📍 ${nearbyCount} lugar${nearbyCount !== 1 ? 'es' : ''} cerca de ti`
                            }
                        </Text>
                    </View>
                    <View style={styles.headerActions}>
                        {/* Center on user GPS button */}
                        <TouchableOpacity
                            style={[styles.headerBtn, { backgroundColor: isDark ? '#2196F3' + '20' : 'rgba(255,255,255,0.2)' }]}
                            onPress={() => {
                                webViewRef.current?.injectJavaScript(`centerOnUser(); true;`);
                            }}
                        >
                            <Ionicons name="locate-outline" size={21} color={isDark ? '#2196F3' : '#FFF'} />
                        </TouchableOpacity>
                        {/* Toggle: nearby vs all */}
                        <TouchableOpacity
                            style={[styles.headerBtn, {
                                backgroundColor: showAllPOIs
                                    ? '#FF9800'
                                    : isDark ? '#FF9800' + '20' : 'rgba(255,255,255,0.2)',
                            }]}
                            onPress={() => {
                                const next = !showAllPOIs;
                                setShowAllPOIs(next);
                                webViewRef.current?.injectJavaScript(`setShowAll(${next}); true;`);
                                if (next) {
                                    webViewRef.current?.injectJavaScript(`showAllAlzira(); true;`);
                                } else {
                                    webViewRef.current?.injectJavaScript(`centerOnUser(); true;`);
                                }
                            }}
                        >
                            <Ionicons
                                name={showAllPOIs ? 'eye' : 'eye-outline'}
                                size={21}
                                color={showAllPOIs ? '#FFF' : (isDark ? '#FF9800' : '#FFF')}
                            />
                        </TouchableOpacity>
                        {/* Reset to home view */}
                        <TouchableOpacity
                            style={[styles.headerBtn, { backgroundColor: isDark ? '#FF9800' + '20' : 'rgba(255,255,255,0.2)' }]}
                            onPress={() => {
                                webViewRef.current?.injectJavaScript(`resetView(); true;`);
                                hidePOICard();
                            }}
                        >
                            <Ionicons name="compass-outline" size={21} color={isDark ? colors.primary : '#FFF'} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Category filter chips */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.chipScroll}
                    contentContainerStyle={styles.chipContainer}
                >
                    <TouchableOpacity
                        style={[
                            styles.chip,
                            activeCategories.size === CATEGORIES.length
                                ? { backgroundColor: isDark ? colors.primary : '#FFF', ...SHADOWS.small }
                                : { backgroundColor: isDark ? colors.background : 'rgba(255,255,255,0.5)', borderWidth: 1, borderColor: isDark ? colors.border : 'rgba(255,255,255,0.6)' },
                        ]}
                        onPress={showAllCategories}
                    >
                        <Ionicons
                            name="grid"
                            size={14}
                            color={activeCategories.size === CATEGORIES.length
                                ? (isDark ? '#FFF' : colors.primary)
                                : (isDark ? colors.textSecondary : 'rgba(255,255,255,0.7)')
                            }
                        />
                        <Text style={[
                            styles.chipText,
                            { color: activeCategories.size === CATEGORIES.length
                                ? (isDark ? '#FFF' : colors.primary)
                                : (isDark ? colors.textSecondary : 'rgba(255,255,255,0.7)')
                            },
                        ]}>
                            Todos
                        </Text>
                        <View style={[styles.chipBadge, {
                            backgroundColor: activeCategories.size === CATEGORIES.length
                                ? (isDark ? 'rgba(255,255,255,0.2)' : colors.primary + '18')
                                : (isDark ? colors.border : 'rgba(255,255,255,0.3)')
                        }]}>
                            <Text style={[styles.chipBadgeText, {
                                color: activeCategories.size === CATEGORIES.length
                                    ? (isDark ? '#FFF' : colors.primary)
                                    : (isDark ? colors.textSecondary : 'rgba(255,255,255,0.8)')
                            }]}>
                                {LOCAL_POIS.length}
                            </Text>
                        </View>
                    </TouchableOpacity>
                    {CATEGORIES.map(cat => {
                        const isActive = activeCategories.has(cat.id);
                        const count = LOCAL_POIS.filter(p => p.category === cat.id).length;
                        return (
                            <TouchableOpacity
                                key={cat.id}
                                style={[
                                    styles.chip,
                                    isActive
                                        ? { backgroundColor: cat.color, ...SHADOWS.small }
                                        : { backgroundColor: isDark ? colors.background : 'rgba(255,255,255,0.5)', borderWidth: 1, borderColor: isDark ? colors.border : 'rgba(255,255,255,0.6)' },
                                ]}
                                onPress={() => toggleCategory(cat.id)}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.chipEmoji}>{cat.emoji}</Text>
                                <Text style={[
                                    styles.chipText,
                                    { color: isActive ? '#FFF' : (isDark ? colors.textSecondary : 'rgba(255,255,255,0.7)') },
                                ]}>
                                    {cat.label}
                                </Text>
                                <View style={[styles.chipBadge, {
                                    backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : (isDark ? colors.border : 'rgba(255,255,255,0.3)')
                                }]}>
                                    <Text style={[styles.chipBadgeText, {
                                        color: isActive ? '#FFF' : (isDark ? colors.textSecondary : 'rgba(255,255,255,0.8)')
                                    }]}>
                                        {count}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            {/* Search bar */}
            <View style={[styles.searchContainer, { backgroundColor: colors.card, borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)' }]}>
                <View style={[styles.searchBar, { backgroundColor: isDark ? colors.background : '#F0F0F5' }]}>
                    <Ionicons name="search" size={18} color={colors.textSecondary} />
                    <TextInput
                        style={[styles.searchInput, { color: colors.text }]}
                        placeholder="Buscar lugar..."
                        placeholderTextColor={colors.textSecondary}
                        value={searchText}
                        onChangeText={setSearchText}
                        onFocus={() => setSearchFocused(true)}
                        onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                    />
                    {searchText.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchText('')}>
                            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Search results dropdown */}
            {searchText.length >= 2 && searchFocused && (
                <View style={[styles.searchResults, { backgroundColor: colors.card, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]}>
                    <ScrollView style={{ maxHeight: 220 }} keyboardShouldPersistTaps="handled">
                        {LOCAL_POIS
                            .filter(p => p.name.toLowerCase().includes(searchText.toLowerCase()) || p.category.toLowerCase().includes(searchText.toLowerCase()))
                            .slice(0, 8)
                            .map(poi => {
                                const cat = getCategory(poi.category);
                                return (
                                    <TouchableOpacity
                                        key={poi.id}
                                        style={[styles.searchResultItem, { borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }]}
                                        onPress={() => {
                                            setSearchText('');
                                            setSearchFocused(false);
                                            showPOICard(poi);
                                            webViewRef.current?.injectJavaScript(
                                                `focusPOI(${poi.lat}, ${poi.lng}); true;`
                                            );
                                        }}
                                    >
                                        <View style={[styles.searchResultIcon, { backgroundColor: getCategoryColor(poi.category) + '20' }]}>
                                            <Text style={{ fontSize: 16 }}>{cat?.emoji}</Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.searchResultName, { color: colors.text }]} numberOfLines={1}>
                                                {poi.name}
                                            </Text>
                                            <Text style={[styles.searchResultCat, { color: getCategoryColor(poi.category) }]}>
                                                {cat?.label}
                                            </Text>
                                        </View>
                                        <Ionicons name="navigate-outline" size={16} color={colors.textSecondary} />
                                    </TouchableOpacity>
                                );
                            })}
                        {LOCAL_POIS
                            .filter(p => p.name.toLowerCase().includes(searchText.toLowerCase()) || p.category.toLowerCase().includes(searchText.toLowerCase()))
                            .length === 0 && (
                            <View style={styles.searchEmpty}>
                                <Ionicons name="search-outline" size={32} color={colors.textSecondary} />
                                <Text style={[styles.searchEmptyText, { color: colors.textSecondary }]}>
                                    No se encontraron resultados
                                </Text>
                            </View>
                        )}
                    </ScrollView>
                </View>
            )}

            {/* Map */}
            <View style={styles.mapWrapper}>
                {mapLoading && (
                    <View style={[styles.mapLoading, { backgroundColor: isDark ? 'rgba(18,18,24,0.95)' : 'rgba(255,255,255,0.95)' }]}>
                        <View style={[styles.loadingCard, { backgroundColor: isDark ? colors.card : '#FFF' }]}>
                            <ActivityIndicator size="large" color={colors.primary} />
                            <Text style={[styles.loadingText, { color: colors.text }]}>🗺️</Text>
                            <Text style={[styles.loadingTitle, { color: colors.text }]}>Cargando mapa</Text>
                            <Text style={[styles.loadingSubtitle, { color: colors.textSecondary }]}>Preparando {LOCAL_POIS.length} lugares de interés...</Text>
                        </View>
                    </View>
                )}
                <WebView
                    ref={webViewRef}
                    source={{ html: getMapHtml() }}
                    style={styles.map}
                    scrollEnabled={false}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    onLoad={() => {
                        setMapLoading(false);
                        // Inject user location once map loads if GPS is ready
                        if (userLocation) {
                            setTimeout(() => {
                                webViewRef.current?.injectJavaScript(
                                    `updateUserLocation(${userLocation.lat}, ${userLocation.lng}); true;`
                                );
                            }, 500);
                        }
                    }}
                    onMessage={onWebViewMessage}
                />

                {/* Legend */}
                <View style={[styles.legend, { backgroundColor: colors.card + 'F0' }]}>
                    <View style={styles.legendItem}>
                        <Text style={{ fontSize: 10 }}>🏠</Text>
                        <Text style={[styles.legendText, { color: colors.textSecondary }]}>Domicilio</Text>
                    </View>
                    <View style={[styles.legendItem, { marginTop: 4 }]}>
                        <View style={[styles.legendDot, { backgroundColor: '#667eea' }]} />
                        <Text style={[styles.legendText, { color: colors.textSecondary }]}>Zona 500m</Text>
                    </View>
                    <View style={[styles.legendItem, { marginTop: 4 }]}>
                        <View style={[styles.legendDot, { backgroundColor: '#2196F3' }]} />
                        <Text style={[styles.legendText, { color: colors.textSecondary }]}>Tu GPS</Text>
                    </View>
                </View>

                {/* GPS status indicator */}
                {!gpsReady && (
                    <View style={[styles.gpsLoading, { backgroundColor: colors.card + 'EE' }]}>
                        <ActivityIndicator size="small" color="#2196F3" />
                        <Text style={[styles.gpsLoadingText, { color: colors.textSecondary }]}>Buscando GPS...</Text>
                    </View>
                )}
            </View>

            {/* ─── Selected POI Card with Photo ─── */}
            {selectedPOI && (
                <Animated.View
                    style={[
                        styles.poiCard,
                        {
                            backgroundColor: colors.card,
                            transform: [{ translateY: slideAnim }],
                        },
                    ]}
                >
                    <TouchableOpacity style={styles.poiCardClose} onPress={hidePOICard}>
                        <Ionicons name="close-circle" size={28} color="rgba(255,255,255,0.85)" />
                    </TouchableOpacity>

                    {/* Photo */}
                    <Image
                        source={{ uri: selectedPOI.image || CATEGORY_FALLBACK_IMAGES[selectedPOI.category] || CATEGORY_FALLBACK_IMAGES.parque }}
                        style={styles.poiPhoto}
                        resizeMode="cover"
                    />

                    <View style={styles.poiCardBody}>
                        {/* Title row */}
                        <View style={styles.poiCardContent}>
                            <View style={[styles.poiCategoryBadge, { backgroundColor: getCategoryColor(selectedPOI.category) }]}>
                                <Text style={styles.poiCategoryEmoji}>
                                    {getCategory(selectedPOI.category)?.emoji}
                                </Text>
                            </View>
                            <View style={styles.poiCardInfo}>
                                <Text style={[styles.poiCardName, { color: colors.text }]} numberOfLines={1}>
                                    {selectedPOI.name}
                                </Text>
                                <Text style={[styles.poiCardCategory, { color: getCategoryColor(selectedPOI.category) }]}>
                                    {getCategory(selectedPOI.category)?.label}
                                </Text>
                            </View>
                        </View>

                        {/* Details */}
                        <View style={styles.poiCardDetails}>
                            {selectedPOI.address && (
                                <View style={styles.poiDetailRow}>
                                    <Ionicons name="location-outline" size={15} color={colors.textSecondary} />
                                    <Text style={[styles.poiDetailText, { color: colors.text }]}>{selectedPOI.address}</Text>
                                </View>
                            )}
                            {selectedPOI.description && (
                                <View style={styles.poiDetailRow}>
                                    <Ionicons name="information-circle-outline" size={15} color={colors.textSecondary} />
                                    <Text style={[styles.poiDetailText, { color: colors.textSecondary, fontStyle: 'italic' }]}>{selectedPOI.description}</Text>
                                </View>
                            )}
                            {selectedPOI.horario && (
                                <View style={styles.poiDetailRow}>
                                    <Ionicons name="time-outline" size={15} color={colors.textSecondary} />
                                    <Text style={[styles.poiDetailText, { color: colors.text }]}>{selectedPOI.horario}</Text>
                                </View>
                            )}
                            {selectedPOI.phone && (
                                <TouchableOpacity
                                    style={styles.poiDetailRow}
                                    onPress={() => Linking.openURL(`tel:${selectedPOI.phone?.replace(/\s/g, '')}`)}
                                >
                                    <Ionicons name="call-outline" size={15} color={colors.primary} />
                                    <Text style={[styles.poiDetailText, { color: colors.primary, textDecorationLine: 'underline' }]}>{selectedPOI.phone}</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Route info bar (appears after calculating route) */}
                        {routeInfo && (
                            <View style={[styles.routeInfoBar, { backgroundColor: '#4285F4' + '12' }]}>
                                <View style={styles.routeInfoItem}>
                                    <Ionicons name="walk-outline" size={20} color="#4285F4" />
                                    <Text style={[styles.routeInfoValue, { color: '#4285F4' }]}>{routeInfo.duration} min</Text>
                                    <Text style={[styles.routeInfoLabel, { color: colors.textSecondary }]}>andando</Text>
                                </View>
                                <View style={[styles.routeInfoDivider, { backgroundColor: '#4285F4' + '30' }]} />
                                <View style={styles.routeInfoItem}>
                                    <Ionicons name="resize-outline" size={20} color="#4285F4" />
                                    <Text style={[styles.routeInfoValue, { color: '#4285F4' }]}>{routeInfo.distance} km</Text>
                                    <Text style={[styles.routeInfoLabel, { color: colors.textSecondary }]}>distancia</Text>
                                </View>
                            </View>
                        )}

                        {/* Action buttons */}
                        <View style={styles.poiActions}>
                            <TouchableOpacity
                                style={[styles.poiActionBtn, { backgroundColor: '#4285F4' }]}
                                onPress={() => {
                                    setRouteInfo(null);
                                    webViewRef.current?.injectJavaScript(
                                        `drawRoute(${selectedPOI.lat}, ${selectedPOI.lng}); true;`
                                    );
                                }}
                            >
                                <Ionicons name="navigate-outline" size={17} color="#FFF" />
                                <Text style={styles.poiActionText}>Cómo llegar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.poiActionBtn, { backgroundColor: '#34A853' }]}
                                onPress={() => openDirections(selectedPOI.lat, selectedPOI.lng)}
                            >
                                <Ionicons name="map-outline" size={17} color="#FFF" />
                                <Text style={styles.poiActionText}>Google Maps</Text>
                            </TouchableOpacity>
                        </View>
                        {/* See real photos on Google */}
                        <TouchableOpacity
                            style={[styles.googlePhotosBtn, { borderColor: colors.border }]}
                            onPress={() => openGoogleMapsPhotos(selectedPOI)}
                        >
                            <Ionicons name="camera-outline" size={16} color={colors.textSecondary} />
                            <Text style={[styles.googlePhotosBtnText, { color: colors.textSecondary }]}>Ver fotos reales en Google Maps</Text>
                            <Ionicons name="open-outline" size={14} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            )}


        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingTop: Platform.OS === 'ios' ? 56 : 44,
        paddingHorizontal: SPACING.lg,
        paddingBottom: SPACING.sm + 2,
        ...SHADOWS.medium,
        zIndex: 10,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerActions: {
        flexDirection: 'row',
        gap: 8,
    },
    headerBtn: {
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: -0.3,
    },
    subtitle: {
        fontSize: 12,
        marginTop: 3,
        fontWeight: '500',
        letterSpacing: 0.1,
    },
    chipScroll: {
        marginTop: SPACING.sm,
    },
    chipContainer: {
        paddingRight: SPACING.lg,
        gap: 8,
        flexDirection: 'row',
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 22,
        gap: 5,
    },
    chipEmoji: {
        fontSize: 14,
    },
    chipText: {
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 0.1,
    },
    chipBadge: {
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 10,
        marginLeft: 2,
    },
    chipBadgeText: {
        fontSize: 10,
        fontWeight: '800',
    },
    // ─── Search bar ───
    searchContainer: {
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs + 2,
        borderBottomWidth: 1,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: Platform.OS === 'ios' ? 10 : 2,
        gap: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        fontWeight: '500',
    },
    searchResults: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 195 : 175,
        left: SPACING.md,
        right: SPACING.md,
        borderRadius: 16,
        ...SHADOWS.large,
        zIndex: 30,
        overflow: 'hidden',
        borderWidth: 1,
    },
    searchResultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 12,
        gap: 12,
        borderBottomWidth: 1,
    },
    searchResultIcon: {
        width: 36,
        height: 36,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchResultName: {
        fontSize: 14,
        fontWeight: '700',
    },
    searchResultCat: {
        fontSize: 11,
        fontWeight: '600',
        marginTop: 1,
    },
    searchEmpty: {
        alignItems: 'center',
        paddingVertical: 24,
        gap: 8,
    },
    searchEmptyText: {
        fontSize: 13,
        fontWeight: '500',
    },
    mapWrapper: {
        flex: 1,
        position: 'relative',
    },
    map: {
        flex: 1,
    },
    mapLoading: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingCard: {
        alignItems: 'center',
        paddingVertical: 32,
        paddingHorizontal: 40,
        borderRadius: 24,
        ...SHADOWS.medium,
        gap: 8,
    },
    loadingText: {
        fontSize: 40,
        marginTop: SPACING.sm,
    },
    loadingTitle: {
        fontSize: 17,
        fontWeight: '700',
    },
    loadingSubtitle: {
        fontSize: 12,
        fontWeight: '500',
        textAlign: 'center',
    },
    legend: {
        position: 'absolute',
        top: SPACING.sm,
        right: SPACING.sm,
        borderRadius: 14,
        paddingHorizontal: 12,
        paddingVertical: 8,
        ...SHADOWS.small,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    legendDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.5)',
    },
    legendText: {
        fontSize: 11,
        fontWeight: '600',
    },
    // GPS loading indicator
    gpsLoading: {
        position: 'absolute',
        top: SPACING.sm,
        left: SPACING.sm,
        borderRadius: 14,
        paddingHorizontal: 12,
        paddingVertical: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        ...SHADOWS.small,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    gpsLoadingText: {
        fontSize: 11,
        fontWeight: '500',
    },
    // ─── POI Card ───
    poiCard: {
        position: 'absolute',
        bottom: 70,
        left: SPACING.sm,
        right: SPACING.sm,
        borderRadius: 24,
        overflow: 'hidden',
        ...SHADOWS.large,
        zIndex: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    poiCardClose: {
        position: 'absolute',
        top: 10,
        right: 10,
        zIndex: 10,
        backgroundColor: 'rgba(0,0,0,0.35)',
        borderRadius: 16,
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    poiPhoto: {
        width: '100%',
        height: 150,
        backgroundColor: '#e0e0e0',
    },
    poiCardBody: {
        padding: SPACING.md,
    },
    poiCardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        marginBottom: SPACING.xs,
    },
    poiCategoryBadge: {
        width: 48,
        height: 48,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.small,
    },
    poiCategoryEmoji: {
        fontSize: 22,
    },
    poiCardInfo: {
        flex: 1,
    },
    poiCardName: {
        fontSize: 17,
        fontWeight: '800',
        letterSpacing: -0.2,
    },
    poiCardCategory: {
        fontSize: 12,
        fontWeight: '700',
        marginTop: 2,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    poiCardDetails: {
        marginTop: 6,
        gap: 5,
    },
    poiDetailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
    },
    poiDetailText: {
        fontSize: 12,
        flex: 1,
    },
    // ─── Route info bar ───
    routeInfoBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 16,
        paddingVertical: 12,
        paddingHorizontal: 18,
        marginTop: SPACING.sm,
    },
    routeInfoItem: {
        flex: 1,
        alignItems: 'center',
        gap: 3,
    },
    routeInfoValue: {
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: -0.3,
    },
    routeInfoLabel: {
        fontSize: 10,
        fontWeight: '500',
    },
    routeInfoDivider: {
        width: 1,
        height: 32,
        marginHorizontal: 12,
    },
    // ─── Action buttons ───
    poiActions: {
        flexDirection: 'row',
        gap: 10,
        marginTop: SPACING.sm + 2,
    },
    poiActionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        paddingVertical: 13,
        borderRadius: 16,
        ...SHADOWS.small,
    },
    poiActionText: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '800',
        letterSpacing: 0.2,
    },
    // ─── Google Photos button ───
    googlePhotosBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        marginTop: SPACING.sm,
        paddingVertical: 11,
        borderRadius: 14,
        borderWidth: 1.5,
    },
    googlePhotosBtnText: {
        fontSize: 12,
        fontWeight: '700',
    },

});

export default React.memo(MapaZonaScreen);
