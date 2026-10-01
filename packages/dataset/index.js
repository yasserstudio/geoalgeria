const path = require("path");
const fs = require("fs");

function load(file) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, "data", file), "utf-8"));
}

let _wilayas,
  _communes,
  _dairas,
  _ecommerce,
  _all,
  _postOffices,
  _atms,
  _nameHistory,
  _phoneCodeProvenance;

module.exports = {
  get wilayas() {
    if (!_wilayas) {
      _wilayas = this.all.map(({ communes, ...w }) => w);
    }
    return _wilayas;
  },

  get communes() {
    if (!_communes) {
      _communes = [
        ...load("communes_w1_w23.json"),
        ...load("communes_w24_w48.json"),
        ...load("communes_w49_w69.json"),
      ];
    }
    return _communes;
  },

  get dairas() {
    if (!_dairas) _dairas = load("dairas.json");
    return _dairas;
  },

  get ecommerce() {
    if (!_ecommerce) _ecommerce = load("ecommerce/communes.json");
    return _ecommerce;
  },

  get all() {
    if (!_all) _all = load("algeria.json");
    return _all;
  },

  // Post offices & ATMs (Algérie Poste). Mirrored from the @geoalgeria/poste
  // package; see data/poste. Use the standalone @geoalgeria/poste package if you
  // only need postal data.
  get postOffices() {
    if (!_postOffices) _postOffices = load("poste/postoffices.json");
    return _postOffices;
  },

  get atms() {
    if (!_atms) _atms = load("poste/atms.json");
    return _atms;
  },

  // Names this dataset used to carry, with the official text that replaced each
  // one. Corrections land in the record itself; this keeps the older spelling
  // findable, so a stored address or an old export still resolves.
  get nameHistory() {
    if (!_nameHistory) _nameHistory = load("name-history.json");
    return _nameHistory;
  },

  // Why each wilaya of the 2026 cohort (codes 59 to 69) carries the `phone_code`
  // it carries: the official texts searched, and for a null the reason it is null.
  // A code here is taken from an official text or it is not published at all, so
  // read this before inferring one from the mother wilaya.
  get phoneCodeProvenance() {
    if (!_phoneCodeProvenance) _phoneCodeProvenance = load("phone-code-provenance.json");
    return _phoneCodeProvenance;
  },

  getWilaya(code) {
    const n = Number(code);
    return this.wilayas.find((w) => w.code === n);
  },

  getCommunesByWilaya(wilayaCode) {
    const n = Number(wilayaCode);
    return this.communes.filter((c) => c.wilaya_code === n);
  },

  getDairasByWilaya(wilayaCode) {
    const n = Number(wilayaCode);
    return this.dairas.filter((d) => d.wilaya_code === n);
  },

  findCommune(name) {
    const trimmed = String(name).trim();
    const lower = trimmed.toLowerCase();
    const former = new Set(
      this.nameHistory.communes
        .filter(
          (entry) =>
            entry.former_names_fr.some((n) => n.toLowerCase().includes(lower)) ||
            entry.former_names_ar.some((n) => n.includes(trimmed))
        )
        .map((entry) => entry.code_commune)
    );
    return this.communes.filter(
      (c) =>
        c.name_fr.toLowerCase().includes(lower) ||
        c.name_ar.includes(trimmed) ||
        former.has(c.code_commune)
    );
  },

  findByPostalCode(postalCode) {
    const code = String(postalCode).trim();
    return this.communes.filter((c) => c.postal_code === code);
  },

  getPostOfficesByCommune(codeCommune) {
    if (codeCommune == null) return [];
    const code = String(codeCommune).padStart(4, "0");
    return this.postOffices.filter((o) => o.commune_code === code);
  },
};
