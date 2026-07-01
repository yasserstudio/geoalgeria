[English](README.md) | **Français** | [العربية](README.ar.md)

# @geoalgeria/transport

**Le secteur des transports d'Algérie — une seule installation pour tous les modes.**

Paquet parapluie qui ré-exporte tous les jeux de données transport de GeoAlgeria.

```bash
npm install @geoalgeria/transport
```

```js
import transport from "@geoalgeria/transport";
transport.aviation.airports();        // aéroports (ANAC)
transport.ferroviaire.stations();     // rail / tram / métro (SNTF / SETRAM / SEMA)
transport.garesRoutieres.stations();  // gares routières (SOGRAL)
transport.buses.lines();              // réseaux de bus urbains (ETUSA)
```

## Membres

| Espace de noms | Paquet | Contenu |
| --- | --- | --- |
| `aviation` | `@geoalgeria/aviation` | Aéroports civils (ANAC) |
| `ferroviaire` | `@geoalgeria/ferroviaire` | Rail, tram & métro (SNTF / SETRAM / SEMA) |
| `garesRoutieres` | `@geoalgeria/gares-routieres` | Gares routières (SOGRAL) |
| `buses` | `@geoalgeria/buses` | Réseaux de bus urbains (ETUSA) |

## Licence

Le code est sous [MIT](LICENSE). Chaque membre porte sa propre licence de données — voir
les README respectifs.

---

Réalisé par [Yasser's Studio](https://yasser.studio)
