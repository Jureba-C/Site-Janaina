const db = require("./db.js");

const { CAIXA_PADRAO, buildPackage } = require("./empacotamento.js");
const PRODUCTS = {
  1: { name:"Laço Bailarina",        price:34.90, ...CAIXA_PADRAO, category:"laco-unico",  badges:[] },
  2: { name:"Laço Duquesa",          price:49.90, ...CAIXA_PADRAO, category:"laco-unico",  badges:["Mais vendido"] },
  3: { name:"Laço Recém-nascida",    price:29.90, ...CAIXA_PADRAO, category:"laco-unico",  badges:[] },
  4: { name:"Laço Pérola",           price:59.90, ...CAIXA_PADRAO, category:"laco-unico",  badges:[] },
  5: { name:"Laço Borboleta",        price:44.90, ...CAIXA_PADRAO, category:"laco-unico",  badges:[] },
  6: { name:"Kit Presente 3 Laços",  price:89.90, ...CAIXA_PADRAO, category:"kit",         badges:["Novo"] },
  7: { name:"Laço Tiara Flor",       price:39.90, ...CAIXA_PADRAO, category:"tiara",       badges:[] },
  8: { name:"Laço Personalizado",    price:64.90, ...CAIXA_PADRAO, category:"laco-unico",  badges:["Novo"] },
};

const BUILTIN_CATEGORIES = [
  { slug: "laco-unico",  label: "Laço Único" },
  { slug: "parzinho",    label: "Parzinho" },
  { slug: "laco-g",      label: "Laço G" },
  { slug: "laco-pompom", label: "Laço Pompom" },
  { slug: "tiara",       label: "Tiara" },
  { slug: "kit",         label: "Kit" },
  { slug: "bolsa",       label: "Bolsa" },
  { slug: "cabide",      label: "Cabide" },
];
const PRODUCT_CATEGORIES = BUILTIN_CATEGORIES.map(c => c.slug);
const PRODUCT_BADGES = ["Mais vendido", "Novo"];

const CUSTOM_PRODUCT_ID_START = 1000;

const CATEGORIAS_APOSENTADAS = [
  { slug: "maternidade",   label: "Maternidade" },
  { slug: "festa",         label: "Festa" },
  { slug: "batizado",      label: "Batizado" },
  { slug: "dia-a-dia",     label: "Dia a dia" },
  { slug: "presente",      label: "Presente" },
  { slug: "recem-nascido", label: "Recém Nascido" },
];

function categoriasEmUso(){
  const overridesMap = getProductOverridesMap();
  const usadas = new Set();
  for (const id of getAllProductIds()) {
    const cat = effectiveProduct(id, overridesMap).category;
    if (cat) usadas.add(cat);
  }
  return usadas;
}

function getAllCategories(){
  const usadas = categoriasEmUso();
  const lista = [
    ...BUILTIN_CATEGORIES.map(c => ({ ...c, builtin: true })),
    ...db.listCustomCategories().map(c => ({ slug: c.slug, label: c.label, builtin: false })),
    ...CATEGORIAS_APOSENTADAS
      .filter(c => usadas.has(c.slug))
      .map(c => ({ ...c, builtin: true, aposentada: true })),
  ];
  const vistos = new Set();
  return lista.filter(c => (vistos.has(c.slug) ? false : vistos.add(c.slug)));
}
function isValidCategorySlug(slug){
  return getAllCategories().some(c => c.slug === slug);
}

function getProductOverridesMap(){
  const map = new Map();
  for(const row of db.listProductOverrides()) map.set(row.product_id, row);
  return map;
}
function getAllProductIds(){
  const baseOrder = [...Object.keys(PRODUCTS).map(Number), ...db.listCustomProducts().map(p => p.id)];
  const sortOrderById = new Map();
  for(const row of db.listProductOverrides()){
    if(row.sort_order != null) sortOrderById.set(row.product_id, row.sort_order);
  }
  for(const p of db.listCustomProducts()){
    if(p.sort_order != null) sortOrderById.set(p.id, p.sort_order);
  }
  if(sortOrderById.size === 0) return baseOrder;
  return baseOrder
    .map((id, baseIndex) => ({ id, baseIndex, pos: sortOrderById.get(id) }))
    .sort((a, b) => {
      if(a.pos == null && b.pos == null) return a.baseIndex - b.baseIndex;
      if(a.pos == null) return 1;
      if(b.pos == null) return -1;
      return a.pos - b.pos || a.baseIndex - b.baseIndex;
    })
    .map(item => item.id);
}
function photosFromRow(row){
  return row.photos != null ? JSON.parse(row.photos) : (row.photo_url ? [row.photo_url] : []);
}
function effectiveProduct(id, overridesMap){
  if(id >= CUSTOM_PRODUCT_ID_START){
    const custom = db.getCustomProduct(id);
    if(!custom) return null;
    const photos = photosFromRow(custom);
    return {
      name: custom.name, price: custom.price,
      weight: custom.weight, width: custom.width, height: custom.height, length: custom.length,
      caixa: custom.caixa || null,
      category: custom.category, photos, photoUrl: photos[0] || null,
      badges: custom.badges ? JSON.parse(custom.badges) : [],
      description: custom.description || null,
      hidden: Boolean(custom.hidden),
      soldOut: Boolean(custom.sold_out),
    };
  }
  const base = PRODUCTS[id];
  if(!base) return null;
  const override = overridesMap.get(id);
  if(!override) return { ...base, photos: [], photoUrl: null, description: null, hidden: false, soldOut: false };
  const photos = photosFromRow(override);
  return {
    ...base,
    name: override.name || base.name,
    price: override.price != null ? override.price : base.price,
    photos, photoUrl: photos[0] || null,
    category: override.category || base.category,
    badges: override.badges ? JSON.parse(override.badges) : base.badges,
    description: override.description || null,
    hidden: Boolean(override.hidden),
    soldOut: Boolean(override.sold_out),
  };
}

module.exports = {
  CAIXA_PADRAO,
  buildPackage,
  PRODUCTS,
  BUILTIN_CATEGORIES,
  PRODUCT_CATEGORIES,
  PRODUCT_BADGES,
  CUSTOM_PRODUCT_ID_START,
  CATEGORIAS_APOSENTADAS,
  categoriasEmUso,
  getAllCategories,
  isValidCategorySlug,
  getProductOverridesMap,
  getAllProductIds,
  photosFromRow,
  effectiveProduct,
};
