export type Product = {
  slug: string;
  name: string;
  localName: string;
  tagline: string;
  description: string;
  category: "Spice" | "Ferment" | "Grain" | "Legume" | "Seed";
  price: string;
  weight: string;
  image: string;
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
    name: "Yellow Soybeans (Bhatmas)",
    localName: "Bhatmas · पहेँलो भटमास (Hill Soya)",
    tagline: "Sun-dried Sikkim golden soya — the ridge's everyday protein.",
    description:
      "Bhatmas is an essential part of daily life across West Sikkim. Smallholder farmers cultivate non-GMO, organic soya varieties on hillside terraces. Small, firm, and golden-brown. Used dry-roasted as an unhurried evening snack with garlic and salt, boiled into nourishing winter broths, or fermented into traditional kinema.",
    category: "Legume",
    price: "₹230",
    weight: "500g pack",
    image: "/products/Yellow-Soybeans.png",
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
    slug: "white-rajma-chitra",
    name: "White Rajma",
    localName: "Seto Rajma · सेतो राज्मा (Himalayan White Kidney Beans)",
    tagline: "High-altitude white kidney beans — creamy, melt-in-mouth, naturally sweet.",
    description:
      "Grown in pristine, chemical-free mountain terraces of West Sikkim. Himalayan White Rajma is celebrated for its tender skin and rich, buttery texture that dissolves luxuriously when slow-cooked with fresh ginger, garlic, and mountain herbs. High in clean plant protein and dietary fibre.",
    category: "Legume",
    price: "₹180",
    weight: "500g pack",
    image: "/products/rajma.jpg",
    organic: true,
    featured: true,
    altitude: "1,400m – 2,000m",
    harvestSeason: "October – November",
    tastingNotes: ["Silky creamy texture", "Sweet earthy finish", "Thin tender skin"],
    traditionalUses: [
      "Slow-simmered Himalayan rajma curry with ghee and cumin",
      "Mountain bean stew served over hot steamed rice (Dal Bhat)",
      "Wholesome winter soup with garlic and wild mountain herbs",
    ],
    pairingSuggestions: ["Steamed hill rice", "Village ghee", "Dalle Khursani pickle"],
  },
  {
    slug: "millet-powder-roti",
    name: "Millet Powder for Roti",
    localName: "Kodo ko Pitho · कोदोको पिठो (Stone-Ground Ragi Flour)",
    tagline: "Traditional stone-ground finger millet flour for soft, wholesome mountain rotis.",
    description:
      "Milled from 100% organic Himalayan finger millet (Kodo) grown on sun-drenched hill terraces in West Sikkim. Slowly stone-ground in village watermills to preserve the nutrient-rich bran, vital iron, and high natural calcium. Makes deeply satisfying, dark, rustic flatbreads (Kodo ko Roti) and traditional dhido.",
    category: "Grain",
    price: "₹160",
    weight: "500g pack",
    image: "/products/finger-millet-kodo.jpg",
    organic: true,
    featured: true,
    altitude: "1,100m – 1,800m",
    harvestSeason: "October – November",
    tastingNotes: ["Toasted nutty malt", "Rich mineral depth", "Earthy warmth"],
    traditionalUses: [
      "Kodo ko roti (wholesome flatbreads eaten warm with butter and spicy tomato chutney)",
      "Traditional Sikkimese Dhido with local greens and dal",
      "Nutritious morning porridge cooked with water or milk",
    ],
    pairingSuggestions: ["Fresh churned butter", "Gundruk ko jhol", "Dalle chilli chutney"],
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
  {
    slug: "maize-corn-makai",
    name: "Maize (Corn) Seed & Powder",
    localName: "Makai · मकै (Himalayan Native Corn)",
    tagline: "Native mountain hill corn — stone-ground coarse meal and whole sun-dried kernels.",
    description:
      "Grown naturally on terraced hill slopes across West Sikkim. Non-hybrid, chemical-free mountain maize is slow-ripened in Himalayan sun and hand-shelled. Rich in dietary fibre, natural carotenoids, and sweet earthy corn flavour. Available as sun-dried whole kernels for trail roasting or traditional village stone-ground meal for rotis and dhido.",
    category: "Grain",
    price: "₹190",
    weight: "500g pack",
    image: "/products/maize-corn-makai.png",
    organic: true,
    featured: true,
    altitude: "1,100m – 1,700m",
    harvestSeason: "August – October",
    tastingNotes: ["Sweet roasted grain", "Toasted polenta aroma", "Hearty texture"],
    traditionalUses: [
      "Makai ko roti (pan-toasted rustic corn flatbreads)",
      "Makai ko dhido (traditional mountain porridge)",
      "Roasted whole kernels tossed with garlic, salt, and dalle chilli",
    ],
    pairingSuggestions: ["Gundruk ko jhol", "Fresh churned butter", "Dalle chilli momo chutney"],
  },
  {
    slug: "black-gram-kalo-dal",
    name: "Whole Black Gram (Kalo Dal)",
    localName: "Kalo Dal · कालो दाल (Himalayan Black Urad)",
    tagline: "Unpolished mountain whole black gram — earthy, rich, and slow-simmered.",
    description:
      "Hand-harvested from terraced hillside plots in West Sikkim. Unpolished and completely untreated, Himalayan whole black gram develops an intense, velvety broth when slow-cooked over a wood fire. Exceptionally rich in dietary iron, potassium, and plant protein.",
    category: "Legume",
    price: "₹210",
    weight: "500g pack",
    image: "/products/black-gram-kalo-dal.png",
    organic: true,
    featured: true,
    altitude: "1,200m – 1,700m",
    harvestSeason: "October – December",
    tastingNotes: ["Deep earthy aroma", "Creamy velvet broth", "Rich mineral depth"],
    traditionalUses: [
      "Simmered overnight into traditional Kalo Dal with bay leaf and ginger",
      "Tempered with pure village ghee, garlic, and jimbu",
      "Mashed with dalle chilli and mustard oil",
    ],
    pairingSuggestions: ["Steamed mountain rice", "Village ghee", "Millet flatbreads"],
  },
  {
    slug: "rice-beans-masyang",
    name: "Rice Beans (Masyang / Mashem)",
    localName: "Masyang · मस्याङ / मासेम (Indigenous Rice Beans)",
    tagline: "Prized heirloom mountain pulse — buttery sweet, tender, and easily digestible.",
    description:
      "Masyang is an indigenous hill legume cultivated for generations on West Sikkim terraces. Small, cylindrical, and speckled golden-green. Exceptionally easy to digest compared to standard plains lentils, with a remarkably sweet, buttery mouthfeel. A cherished village comfort staple during winter months.",
    category: "Legume",
    price: "₹250",
    weight: "500g pack",
    image: "/products/rice-beans-masyang.png",
    organic: true,
    featured: true,
    altitude: "1,200m – 1,800m",
    harvestSeason: "November – January",
    tastingNotes: ["Sweet nutty broth", "Soft melting skin", "Clean delicate flavour"],
    traditionalUses: [
      "Masyang ko jhol (wholesome slow-simmered winter dal)",
      "Cooked with wild mountain greens and fresh turmeric",
      "Tempered with ginger, garlic, and mountain herbs",
    ],
    pairingSuggestions: ["Steamed basmati rice", "Dalle chilli chutney", "Gundruk sadeko"],
  },
  {
    slug: "green-gram-hariyo-mung",
    name: "Whole Green Gram (Hariyo Mung)",
    localName: "Hariyo Mung · हरियो मूंग (Sabut Moong)",
    tagline: "Terrace-cultivated whole green moong — pure, restorative, and nutrient-dense.",
    description:
      "Grown in chemical-free hill terraces in West Sikkim. Tiny, unpolished emerald grains with intact, nutrient-dense outer skins. Ideal for sprouting into crisp micro-greens or simmering into light, restorative mountain broths. Naturally packed with plant proteins, folate, and antioxidants.",
    category: "Legume",
    price: "₹310",
    weight: "500g pack",
    image: "/products/green-gram-hariyo-mung.png",
    organic: true,
    featured: true,
    altitude: "1,000m – 1,600m",
    harvestSeason: "October – November",
    tastingNotes: ["Clean grassy sweetness", "Light nutty crunch", "Tender broth"],
    traditionalUses: [
      "Daily restorative green moong dal with mountain turmeric and cumin",
      "Sprouted for nutrient-dense morning salads with Himalayan salt and lemon",
      "Comforting khichdi with mountain buckwheat or kodo millet",
    ],
    pairingSuggestions: ["Kodo millet rotis", "Fresh mountain curd", "Local village pickles"],
  },
];

export function getProduct(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export const featuredProducts = products.filter((p) => p.featured);

export function getPriceNumber(priceStr: string): number {
  const num = parseInt(priceStr.replace(/[^0-9]/g, ""), 10);
  return isNaN(num) ? 0 : num;
}
