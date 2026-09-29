[out:json][timeout:900];
area["ISO3166-1"="DZ"]["admin_level"="2"]->.dz;
(
  rel(area.dz)["boundary"="administrative"]["admin_level"="8"];
  rel(area.dz)["boundary"="administrative"]["admin_level"="4"];
)->.adm;
.adm out body;
node(r.adm:"admin_centre")->.ac;
.ac out;
