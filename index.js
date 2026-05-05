const path = require("path");
const fs = require("fs");

function load(file) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, "data", file), "utf-8"));
}

let _wilayas, _communes, _dairas, _ecommerce, _all;

module.exports = {
  get wilayas() {
    if (!_wilayas) _wilayas = load("wilayas.json");
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
    return this.communes.filter(
      (c) =>
        c.name_fr.toLowerCase().includes(lower) ||
        c.name_ar.includes(trimmed)
    );
  },

  findByPostalCode(postalCode) {
    const code = String(postalCode).trim();
    return this.communes.filter((c) => c.postal_code === code);
  },
};
