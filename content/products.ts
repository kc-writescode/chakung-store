export type Product = {
  slug: string;
  name: string;
  localName: string;
  tagline: string;
  description: string;
  category: "Spice" | "Ferment" | "Grain" | "Legume" | "Seed" | "Root";
  price: string;
  weight: string;
  image?: string;
  giTag?: boolean;
  organic: boolean;
  featured?: boolean;
  altitude?: string;
  harvestSeason?: string;
  tastingNotes: string[];
  traditionalUses: string[];
  pairingSuggestions: string[];
};

export const products: Product[] = [
  {
    slug: "dalle-khursani",
    name: "Dalle Khursani",
    localName: "दल्ले खुर्सानी (Himalayan Cherry Chilli)",
    tagline: "Sikkim's celebrated round chilli — fiery, fruity, legendary.",
    description:
      "Grown only in the hill districts of Sikkim and Darjeeling, the Dalle Khursani is one of the world's most pungent chillies (100,000 to 350,000 SHU). It holds an official Geographical Indication (GI) tag from the Government of India. Sun-dried whole over wicker mats on the ridge. Imparts a bright, fruity warmth before delivering its trademark Himalayan heat.",
    category: "Spice",
    price: "₹180",
    weight: "50g pouch",
    image: "/products/dalle-khursani.jpg",
    giTag: true,
    organic: true,
    featured: true,
    altitude: "1,200m – 1,800m",
    harvestSeason: "October – December",
    tastingNotes: ["Cherry aroma", "Smoky floral heat", "Slow lingering finish"],
    traditionalUses: [
      "Crushed with salt, garlic, and tomato for momo chutney",
      "Pickled in mustard oil with local lemons and spices",
      "Infused whole into simmering thukpa and bone broths",
    ],
    pairingSuggestions: ["Steamed momos", "Noodle soups", "Roast mountain pork", "Dal bhat"],
  },
  {
    slug: "turmeric-besar",
    name: "Turmeric",
    localName: "Besar · बेसार (Hill Turmeric)",
    tagline: "Hand-harvested Sikkim turmeric — deep saffron gold, intensely aromatic.",
    description:
      "Sikkim turmeric carries a GI protection. Cultivated in chemical-free terraced loam below the ridge, mountain-grown turmeric develops significantly higher curcumin concentrations than commercial lowland crops. Hand-harvested after winter, boiled, sun-dried, and coarsely ground in traditional village stone mills.",
    category: "Spice",
    price: "₹120",
    weight: "100g jar",
    image: "/products/turmeric-besar.jpg",
    giTag: true,
    organic: true,
    featured: true,
    altitude: "1,100m – 1,500m",
    harvestSeason: "December – February",
    tastingNotes: ["Earth and musk", "Warm peppery spice", "Vivid orange hue"],
    traditionalUses: [
      "Daily tempering in Sikkimese curries and lentil dals",
      "Haldi doodh (warm spiced golden milk) on cold mountain nights",
      "Natural antiseptic and skin soothing remedy",
    ],
    pairingSuggestions: ["Masyam dal", "Bamboo shoot curries", "Fresh ginger broths"],
  },
  {
    slug: "gundruk",
    name: "Gundruk",
    localName: "गुन्द्रुक (Fermented Mustard & Radish Leaves)",
    tagline: "Fermented greens — the irreplaceable soul of a Sikkim mountain kitchen.",
    description:
      "Gundruk is Sikkim's most revered traditional food. Mustard and radish leaves harvested before the frost are wilted in the sun, packed tightly into earthen jars, and fermented naturally for weeks in cool mountain air. Once tangy and sour, they are dried completely in the sun. Probiotic-rich, deeply savoury, and protected with a GI tag.",
    category: "Ferment",
    price: "₹150",
    weight: "100g pack",
    image: "/products/gundruk.jpg",
    giTag: true,
    organic: true,
    featured: true,
    altitude: "1,300m – 1,900m",
    harvestSeason: "November – January",
    tastingNotes: ["Lactic tang", "Earthy umami", "Sun-dried forest greens"],
    traditionalUses: [
      "Gundruk ko jhol (tangy sour soup served over hot rice)",
      "Gundruk sadeko (greens tossed with roasted soya, mustard oil, onion, and chilli)",
      "Simmered with mountain potatoes and smoked meat",
    ],
    pairingSuggestions: ["Bhatmas (roasted soya)", "Hot rice", "Dalle chilli chutney"],
  },
  {
    slug: "buckwheat-phapar",
    name: "Buckwheat",
    localName: "Phapar · फापर (Himalayan Tartary Buckwheat)",
    tagline: "High-altitude grain — gluten-free, nutty, ancient.",
    description:
      "Cultivated on alpine slopes above 1,400 meters where rice cannot thrive. Tartary buckwheat is ancient, hardy, and naturally free of gluten. Exceptionally dense in rutin, magnesium, and dietary fibre. Cleaned and stone-ground into wholesome grey-brown flour or roasted whole as a hearty mountain trail snack.",
    category: "Grain",
    price: "₹95",
    weight: "250g pack",
    image: "/products/buckwheat-phapar.jpg",
    organic: true,
    featured: true,
    altitude: "1,400m – 2,200m",
    harvestSeason: "September – October",
    tastingNotes: ["Nutty and toasted", "Mineral finish", "Subtle pleasant bitterness"],
    traditionalUses: [
      "Phapar ko roti (wholesome flatbread eaten with butter and spicy tomato relish)",
      "Phapar ko pitha (steamed village dumplings)",
      "Buckwheat porridge with wildflower honey and churned butter",
    ],
    pairingSuggestions: ["Local butter", "Gundruk soup", "Mountain wildflower honey"],
  },
  {
    slug: "soybean-bhatmas",
    name: "Soybean",
    localName: "Bhatmas · भटमास (Hill Soya)",
    tagline: "Sun-dried Sikkim soya — the ridge's everyday protein.",
    description:
      "Bhatmas is an essential part of daily life across West Sikkim. Smallholder farmers cultivate non-GMO, organic soya varieties on hillside terraces. Small, firm, and golden-brown. Used dry-roasted as an unhurried evening snack with garlic and salt, boiled into nourishing winter broths, or fermented into traditional kinema.",
    category: "Legume",
    price: "₹70",
    weight: "250g pouch",
    image: "/products/soybean-bhatmas.jpg",
    organic: true,
    featured: true,
    altitude: "1,000m – 1,700m",
    harvestSeason: "November – December",
    tastingNotes: ["Rich nutty crunch", "Toasted grain aroma", "Creamy when slow-cooked"],
    traditionalUses: [
      "Dry-roasted with raw ginger, garlic, and fresh green chilli (Khaja)",
      "Tossed with gundruk and cold-pressed mustard oil",
      "Traditional fermentation into savoury kinema",
    ],
    pairingSuggestions: ["Gundruk", "Dalle chilli", "Millet beer (Tongba)"],
  },
  {
    slug: "rajma-kidney-beans",
    name: "Rajma",
    localName: "Kidney Beans · सानो राज्मा",
    tagline: "Small mountain kidney beans — slow-cooked, buttery, deeply comforting.",
    description:
      "Unlike large commercial plains varieties, Himalayan rajma from Sikkim's terraces are small, speckled maroon, and intensely sweet. The cool mountain nights slow their growth, concentrating starches that turn remarkably velvety and melting when simmered slowly over wood flame with bay leaf and ginger.",
    category: "Legume",
    price: "₹110",
    weight: "250g pack",
    image: "/products/rajma.jpg",
    organic: true,
    featured: true,
    altitude: "1,300m – 1,900m",
    harvestSeason: "October – November",
    tastingNotes: ["Velvety texture", "Sweet earthy broth", "Tender skin"],
    traditionalUses: [
      "Slow-cooked with whole spices, ginger, and ghee",
      "Hearty rajma stew with steamed local mountain rice",
      "Simmered with dried hill mushrooms",
    ],
    pairingSuggestions: ["Steamed basmati", "Ghee", "Mustard oil pickles"],
  },
  {
    slug: "ginger-adrak",
    name: "Ginger",
    localName: "Adrak · अदुवा (Sikkim Hill Ginger)",
    tagline: "Fresh from the terraced loam — pungent, fibrous, citrus-bright.",
    description:
      "Sikkim is famous for its GI-registered organic ginger. The rhizomes are grown on slopes with natural drainage in certified organic soil. Harvested by hand after the monsoons, they contain high essential oil content, giving an intense heat balanced by zesty lime-like freshness. Sliced, sun-dried, and packed whole.",
    category: "Root",
    price: "₹90",
    weight: "100g pack",
    giTag: true,
    organic: true,
    altitude: "1,000m – 1,600m",
    harvestSeason: "December – February",
    tastingNotes: ["Citrus zest", "Sharp clean heat", "Woody floral aroma"],
    traditionalUses: [
      "Crushed in mountain tea (adrak chai) to ward off high-altitude chills",
      "Pounded with garlic for momo stuffing and meat marinades",
      "Dried into sun-baked sonth for digestive infusions",
    ],
    pairingSuggestions: ["Black tea", "Wild mountain honey", "Chilli pickles"],
  },
  {
    slug: "mustard-seeds",
    name: "Mustard Seeds",
    localName: "Rayo ko Geda · तोरी",
    tagline: "Small black mountain seeds — pungent, bright, indispensable.",
    description:
      "Cultivated on terraced slopes, these small, black and reddish-brown mustard seeds are the cornerstone of Eastern Himalayan seasoning. When popped in hot ghee or oil, they release a nutty, crackling warmth. Pressed locally in village expellers for raw, aromatic mustard oil.",
    category: "Seed",
    price: "₹60",
    weight: "100g pack",
    organic: true,
    altitude: "900m – 1,600m",
    harvestSeason: "March – April",
    tastingNotes: ["Pungent crackle", "Nutty warmth", "Clean sharp bite"],
    traditionalUses: [
      "Tempering for dal, sauteed leafy greens, and squash",
      "Ground into paste for fermented radish and cucumber pickles",
      "Cold-pressed for pure cooking and massage oil",
    ],
    pairingSuggestions: ["Sauteed saag", "Gundruk", "Local dal"],
  },
  {
    slug: "rice-bean-masyam",
    name: "Rice Bean",
    localName: "Masyam Dal · मस्याम",
    tagline: "A tiny purple-speckled heritage legume from West Sikkim's high ridges.",
    description:
      "Masyam (Vigna umbellata) is a native heritage pulse cultivated for generations in village kitchen gardens across Soreng district. The tiny beans have a beautiful mottled purple-and-cream coat. They cook down into a rich, silky dal with unmatched mineral depth and complete protein profile.",
    category: "Legume",
    price: "₹100",
    weight: "250g pack",
    organic: true,
    altitude: "1,200m – 1,800m",
    harvestSeason: "November – December",
    tastingNotes: ["Mild sweetness", "Silky broth", "Delicate nutty aroma"],
    traditionalUses: [
      "Slow-cooked with ghee, cumin, and dried dalle chilli for evening dal",
      "Sprouted and tossed in raw mountain salads",
      "Ground into wholesome flour for steamed dumplings",
    ],
    pairingSuggestions: ["Makai roti", "Steamed rice", "Smoky roasted tomato relish"],
  },
  {
    slug: "maize-makai",
    name: "Maize Seed",
    localName: "Makai · मकई (Ridge Heritage Corn)",
    tagline: "Sun-drenched yellow corn from the Chakung slopes.",
    description:
      "Heritage flint corn grown along the ridge. After harvest, full cobs are braided together and hung to dry under the overhanging eaves of bamboo houses, protected from rain by the roofline. Once fully cured in the dry winter air, kernels are stripped and ground into golden polenta-style grits for dhindo.",
    category: "Grain",
    price: "₹50",
    weight: "250g bag",
    organic: true,
    altitude: "1,100m – 1,700m",
    harvestSeason: "August – September",
    tastingNotes: ["Sun-ripened corn sweetness", "Firm toothsome texture", "Clean toasted grain"],
    traditionalUses: [
      "Stone-ground for dhindo (the hearty traditional boiled porridge)",
      "Dry-roasted with bhatmas for traditional mountain trail mix",
      "Pounded into coarse grits for breakfast porridge",
    ],
    pairingSuggestions: ["Gundruk soup", "Chilled village curd", "Spicy chicken jhol"],
  },
  {
    slug: "finger-millet-kodo",
    name: "Finger Millet",
    localName: "Kodo · कोदो (Ancient Red Millet)",
    tagline: "An ancient Himalayan grain — slow to digest, deeply restorative.",
    description:
      "Kodo is among the oldest cultivated crops in the eastern Himalayas. Naturally drought-hardy and resilient, it thrives in thin mountain soils. Exceptionally high in calcium, dietary iron, and complex starches that release energy steadily throughout the day. Used to brew the legendary warm drink tongba.",
    category: "Grain",
    price: "₹80",
    weight: "250g pack",
    image: "/products/finger-millet-kodo.jpg",
    organic: true,
    featured: true,
    altitude: "1,000m – 1,800m",
    harvestSeason: "October – November",
    tastingNotes: ["Earthy malt", "Nutty depth", "Subtle sourdough nuance"],
    traditionalUses: [
      "Fermented and brewed with mountain herbs into tongba, served warm in bamboo pots",
      "Kodo ko roti (dark, mineral-rich rustic flatbreads)",
      "Breakfast kodo porridge with goat milk and jaggery",
    ],
    pairingSuggestions: ["Warm water in bamboo steins", "Gundruk soup", "Fresh butter"],
  },
  {
    slug: "local-beans-simi",
    name: "Local Beans",
    localName: "Simi · सिमी (Himalayan Runner Beans)",
    tagline: "Flat-podded heirloom beans from village bamboo trellises.",
    description:
      "Simi are the broad, flat climbing beans that village families grow along perimeter bamboo fences and sunny porch rails. Plump, creamy, and dried naturally right on the vine in late autumn. Rich in dietary fiber, folates, and slow-burning energy.",
    category: "Legume",
    price: "₹85",
    weight: "250g pack",
    organic: true,
    altitude: "1,200m – 1,900m",
    harvestSeason: "October – November",
    tastingNotes: ["Creamy centre", "Tender pod", "Fresh vegetal sweetness"],
    traditionalUses: [
      "Stewed with sliced potatoes, fresh ginger, and green chillies",
      "Dry-sauteed in cold-pressed mustard oil with turmeric and cumin",
      "Simmered in light tomato gravy with mountain herbs",
    ],
    pairingSuggestions: ["Steamed buckwheat roti", "Mustard greens", "Dal"],
  },
  {
    slug: "pumpkin-seeds",
    name: "Pumpkin Seeds",
    localName: "Pharsi ko Geda · फर्सीको गेडा",
    tagline: "Sun-dried seeds from native sweet red mountain pumpkins.",
    description:
      "West Sikkim's deep valleys yield sweet, dense mountain pumpkins that store well through freezing winters. Their plump seeds are scooped out, washed in clear spring water, and sun-dried on wide bamboo mats. Packed with natural plant sterols, zinc, magnesium, and restorative fats.",
    category: "Seed",
    price: "₹140",
    weight: "100g pack",
    image: "/products/pumpkin-seeds.jpg",
    organic: true,
    featured: true,
    altitude: "1,100m – 1,700m",
    harvestSeason: "November – January",
    tastingNotes: ["Buttery crunch", "Toasted sunflower undertone", "Mild mineral finish"],
    traditionalUses: [
      "Lightly roasted in dry iron pans with Himalayan pink salt",
      "Crushed with roasted sesame, garlic, and dalle chilli into traditional chuka relish",
      "Sprinkled over morning buckwheat or millet porridge",
    ],
    pairingSuggestions: ["Roasted bhatmas", "Morning porridge", "Trail snacks"],
  },
];

export function getProduct(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export const featuredProducts = products.filter((p) => p.featured);

