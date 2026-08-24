# Canonical unit inventory

Contract for Instrument. **Identity is the unit id**, not the symbol.

Conversion kinds: `linear` (canonical = value × factor), `affine` (canonical = value × scale + offset).
Reference-dependent conversions (true gauge pressure) are **not** in this version.

## Status

- `canonical` — SI-honest unit in the family
- `compatibility` — kept so existing data/UI do not break; **not** extra physics

`bar(g)` / `bar(abs)` currently have **no atmospheric-reference conversion**. They use the same factor as `bar`.

## Families

### `dimensionless` — Dimensionless (canonical `1`)

Gauge studio counts, ratios, and percent. Caliper shop skips % on some declared fields — that skip stays in the Caliper adapter.

| Unit ID | Symbol | Kind | Factor / affine | Aliases | Status |
|---|---|---|---|---|---|
| `dimensionless.one` | 1 | linear | × 1 | ratio | canonical |
| `dimensionless.percent` | % | linear | × 0.01 | percent | canonical |

### `length` — Length (canonical `m`)

yd is Caliper-only today; additive for Gauge.

| Unit ID | Symbol | Kind | Factor / affine | Aliases | Status |
|---|---|---|---|---|---|
| `length.m` | m | linear | × 1 | metre, meter | canonical |
| `length.mm` | mm | linear | × 0.001 | millimeter | canonical |
| `length.cm` | cm | linear | × 0.01 | centimeter | canonical |
| `length.km` | km | linear | × 1000.0 | kilometer | canonical |
| `length.um` | µm | linear | × 1e-06 | um, micrometre, micrometer | canonical |
| `length.in` | in | linear | × 0.0254 | inch | canonical |
| `length.ft` | ft | linear | × 0.3048 | foot, feet | canonical |
| `length.yd` | yd | linear | × 0.9144 | yard | canonical |

### `area` — Area (canonical `m²`)

| Unit ID | Symbol | Kind | Factor / affine | Aliases | Status |
|---|---|---|---|---|---|
| `area.m2` | m² | linear | × 1 | m2 | canonical |
| `area.mm2` | mm² | linear | × 1e-06 | mm2 | canonical |
| `area.cm2` | cm² | linear | × 0.0001 | cm2 | canonical |
| `area.in2` | in² | linear | × 0.00064516 | in2 | canonical |
| `area.ft2` | ft² | linear | × 0.09290304 | ft2 | canonical |

### `volume` — Volume (canonical `m³`)

mL is Caliper-only today.

| Unit ID | Symbol | Kind | Factor / affine | Aliases | Status |
|---|---|---|---|---|---|
| `volume.m3` | m³ | linear | × 1 | m3 | canonical |
| `volume.L` | L | linear | × 0.001 | l, liter, litre | canonical |
| `volume.mL` | mL | linear | × 1e-06 | ml | canonical |
| `volume.ft3` | ft³ | linear | × 0.028316846592 | ft3 | canonical |
| `volume.gal_us` | gal (US) | linear | × 0.003785411784 | gal, US gal | canonical |

### `mass` — Mass (canonical `kg`)

oz is Caliper-only today.

| Unit ID | Symbol | Kind | Factor / affine | Aliases | Status |
|---|---|---|---|---|---|
| `mass.kg` | kg | linear | × 1 | — | canonical |
| `mass.g` | g | linear | × 0.001 | — | canonical |
| `mass.tonne` | t | linear | × 1000.0 | tonne, t | canonical |
| `mass.lbm` | lbm | linear | × 0.45359237 | lb | canonical |
| `mass.oz` | oz | linear | × 0.028349523125 | — | canonical |

### `time` — Time (canonical `s`)

day is Caliper-only today.

| Unit ID | Symbol | Kind | Factor / affine | Aliases | Status |
|---|---|---|---|---|---|
| `time.s` | s | linear | × 1 | sec | canonical |
| `time.min` | min | linear | × 60 | — | canonical |
| `time.h` | h | linear | × 3600 | hr | canonical |
| `time.day` | day | linear | × 86400 | — | canonical |

### `angle` — Angle (canonical `rad`)

Stable id is angle.degree. Symbol °; alias deg (Caliper engine key). Caliper-only family today.

| Unit ID | Symbol | Kind | Factor / affine | Aliases | Status |
|---|---|---|---|---|---|
| `angle.rad` | rad | linear | × 1 | radian | canonical |
| `angle.degree` | ° | linear | × 0.017453292519943295 | deg, degree | canonical |
| `angle.rev` | rev | linear | × 6.283185307179586 | turn | canonical |

### `force` — Force (canonical `N`)

| Unit ID | Symbol | Kind | Factor / affine | Aliases | Status |
|---|---|---|---|---|---|
| `force.N` | N | linear | × 1 | — | canonical |
| `force.kN` | kN | linear | × 1000.0 | — | canonical |
| `force.MN` | MN | linear | × 1000000.0 | — | canonical |
| `force.lbf` | lbf | linear | × 4.4482216152605 | — | canonical |

### `pressure` — Pressure (canonical `Pa`)

bar(g) / bar(abs) / kPa(abs) are compatibility labels. They do not add or subtract 101325 Pa.

| Unit ID | Symbol | Kind | Factor / affine | Aliases | Status |
|---|---|---|---|---|---|
| `pressure.Pa` | Pa | linear | × 1 | — | canonical |
| `pressure.kPa` | kPa | linear | × 1000.0 | — | canonical |
| `pressure.MPa` | MPa | linear | × 1000000.0 | — | canonical |
| `pressure.bar` | bar | linear | × 100000.0 | — | canonical |
| `pressure.bar_gauge` | bar(g) | linear | × 100000.0 | barg | compatibility |
| `pressure.bar_abs` | bar(abs) | linear | × 100000.0 | bara | compatibility |
| `pressure.kPa_abs` | kPa(abs) | linear | × 1000.0 | — | compatibility |
| `pressure.mbar` | mbar | linear | × 100 | mbar abs | canonical |
| `pressure.psi` | psi | linear | × 6894.757293168 | — | canonical |
| `pressure.atm` | atm | linear | × 101325 | — | canonical |

### `stress` — Stress (canonical `Pa`)

Pa/psi also exist on pressure. Identity is the unit id (stress.Pa), not the symbol.

| Unit ID | Symbol | Kind | Factor / affine | Aliases | Status |
|---|---|---|---|---|---|
| `stress.Pa` | Pa | linear | × 1 | — | canonical |
| `stress.kPa` | kPa | linear | × 1000.0 | — | canonical |
| `stress.MPa` | MPa | linear | × 1000000.0 | — | canonical |
| `stress.GPa` | GPa | linear | × 1000000000.0 | — | canonical |
| `stress.N_per_mm2` | N/mm² | linear | × 1000000.0 | N/mm2 | canonical |
| `stress.psi` | psi | linear | × 6894.757293168 | — | canonical |
| `stress.ksi` | ksi | linear | × 6894757.293168 | — | canonical |

### `torque` — Torque (canonical `N·m`)

| Unit ID | Symbol | Kind | Factor / affine | Aliases | Status |
|---|---|---|---|---|---|
| `torque.N_m` | N·m | linear | × 1 | N.m, Nm | canonical |
| `torque.kN_m` | kN·m | linear | × 1000.0 | — | canonical |
| `torque.lbf_ft` | lbf·ft | linear | × 1.3558179483314 | — | canonical |
| `torque.lbf_in` | lbf·in | linear | × 0.1129848290276167 | — | canonical |

### `acceleration` — Acceleration (canonical `m/s²`)

| Unit ID | Symbol | Kind | Factor / affine | Aliases | Status |
|---|---|---|---|---|---|
| `acceleration.m_s2` | m/s² | linear | × 1 | m/s2 | canonical |
| `acceleration.g` | g | linear | × 9.80665 | — | canonical |
| `acceleration.ft_s2` | ft/s² | linear | × 0.3048 | — | canonical |

### `speed` — Speed (canonical `m/s`)

| Unit ID | Symbol | Kind | Factor / affine | Aliases | Status |
|---|---|---|---|---|---|
| `speed.m_s` | m/s | linear | × 1 | — | canonical |
| `speed.mm_s` | mm/s | linear | × 0.001 | — | canonical |
| `speed.m_min` | m/min | linear | × 0.016666666666666666 | — | canonical |
| `speed.mm_min` | mm/min | linear | × 1.6666666666666667e-05 | — | canonical |
| `speed.km_h` | km/h | linear | × 0.2777777777777778 | — | canonical |
| `speed.mph` | mph | linear | × 0.44704 | — | canonical |
| `speed.ft_s` | ft/s | linear | × 0.3048 | — | canonical |

### `energy` — Energy / work (canonical `J`)

| Unit ID | Symbol | Kind | Factor / affine | Aliases | Status |
|---|---|---|---|---|---|
| `energy.J` | J | linear | × 1 | — | canonical |
| `energy.kJ` | kJ | linear | × 1000.0 | — | canonical |
| `energy.MJ` | MJ | linear | × 1000000.0 | — | canonical |
| `energy.Wh` | Wh | linear | × 3600 | — | canonical |
| `energy.kWh` | kWh | linear | × 3600000.0 | — | canonical |
| `energy.Btu` | Btu | linear | × 1055.05585262 | — | canonical |

### `power` — Power / heat flow (canonical `W`)

| Unit ID | Symbol | Kind | Factor / affine | Aliases | Status |
|---|---|---|---|---|---|
| `power.W` | W | linear | × 1 | — | canonical |
| `power.kW` | kW | linear | × 1000.0 | — | canonical |
| `power.MW` | MW | linear | × 1000000.0 | — | canonical |
| `power.hp` | hp | linear | × 745.6998715822702 | — | canonical |
| `power.Btu_h` | Btu/h | linear | × 0.293071070172 | — | canonical |

### `temperature` — Temperature (absolute) (canonical `K`)

Affine: canonical K = scale × value + offset. Do not use this family for intervals (LMTD, ΔT). Use temperatureDelta.

| Unit ID | Symbol | Kind | Factor / affine | Aliases | Status |
|---|---|---|---|---|---|
| `temperature.K` | K | affine | × 1 + 0 | kelvin | canonical |
| `temperature.degC` | °C | affine | × 1 + 273.15 | C, celsius | canonical |
| `temperature.degF` | °F | affine | × 0.5555555555555556 + 255.3722222222222 | F, fahrenheit | canonical |
| `temperature.degR` | °R | affine | × 0.5555555555555556 + 0 | R, rankine | canonical |

### `temperatureDelta` — Temperature difference (canonical `K`)

Linear intervals. 1 °C Δ = 1 K; 1 °F Δ = 5/9 K. Gauge-only family today.

| Unit ID | Symbol | Kind | Factor / affine | Aliases | Status |
|---|---|---|---|---|---|
| `temperatureDelta.K` | K | linear | × 1 | — | canonical |
| `temperatureDelta.degC` | °C | linear | × 1 | C | canonical |
| `temperatureDelta.degF` | °F | linear | × 0.5555555555555556 | F | canonical |

### `density` — Density (canonical `kg/m³`)

| Unit ID | Symbol | Kind | Factor / affine | Aliases | Status |
|---|---|---|---|---|---|
| `density.kg_m3` | kg/m³ | linear | × 1 | — | canonical |
| `density.g_cm3` | g/cm³ | linear | × 1000.0 | — | canonical |
| `density.lbm_ft3` | lbm/ft³ | linear | × 16.01846337396 | — | canonical |
| `density.lbm_in3` | lbm/in³ | linear | × 27679.904710191 | — | canonical |

### `dynamicViscosity` — Dynamic viscosity (canonical `Pa·s`)

| Unit ID | Symbol | Kind | Factor / affine | Aliases | Status |
|---|---|---|---|---|---|
| `dynamicViscosity.Pa_s` | Pa·s | linear | × 1 | — | canonical |
| `dynamicViscosity.cP` | cP | linear | × 0.001 | — | canonical |
| `dynamicViscosity.P` | P | linear | × 0.1 | — | canonical |

### `kinematicViscosity` — Kinematic viscosity (canonical `m²/s`)

| Unit ID | Symbol | Kind | Factor / affine | Aliases | Status |
|---|---|---|---|---|---|
| `kinematicViscosity.m2_s` | m²/s | linear | × 1 | — | canonical |
| `kinematicViscosity.cSt` | cSt | linear | × 1e-06 | — | canonical |
| `kinematicViscosity.ft2_s` | ft²/s | linear | × 0.09290304 | — | canonical |

### `volumetricFlow` — Volumetric flow (canonical `m³/s`)

| Unit ID | Symbol | Kind | Factor / affine | Aliases | Status |
|---|---|---|---|---|---|
| `volumetricFlow.m3_s` | m³/s | linear | × 1 | — | canonical |
| `volumetricFlow.L_s` | L/s | linear | × 0.001 | — | canonical |
| `volumetricFlow.L_min` | L/min | linear | × 1.6666666666666667e-05 | — | canonical |
| `volumetricFlow.us_gpm` | gal/min | linear | × 6.30901964e-05 | US gpm, gpm | canonical |
| `volumetricFlow.cfm` | cfm | linear | × 0.0004719474432 | — | canonical |

### `frequency` — Frequency (canonical `Hz`)

rpm stays under frequency. Caliper-only family today.

| Unit ID | Symbol | Kind | Factor / affine | Aliases | Status |
|---|---|---|---|---|---|
| `frequency.Hz` | Hz | linear | × 1 | — | canonical |
| `frequency.kHz` | kHz | linear | × 1000.0 | — | canonical |
| `frequency.MHz` | MHz | linear | × 1000000.0 | — | canonical |
| `frequency.rpm` | rpm | linear | × 0.016666666666666666 | — | canonical |

### `voltage` — Voltage (canonical `V`)

| Unit ID | Symbol | Kind | Factor / affine | Aliases | Status |
|---|---|---|---|---|---|
| `voltage.V` | V | linear | × 1 | — | canonical |
| `voltage.mV` | mV | linear | × 0.001 | — | canonical |
| `voltage.kV` | kV | linear | × 1000.0 | — | canonical |

### `current` — Current (canonical `A`)

| Unit ID | Symbol | Kind | Factor / affine | Aliases | Status |
|---|---|---|---|---|---|
| `current.A` | A | linear | × 1 | — | canonical |
| `current.mA` | mA | linear | × 0.001 | — | canonical |
| `current.kA` | kA | linear | × 1000.0 | — | canonical |

### `resistance` — Resistance (canonical `Ω`)

| Unit ID | Symbol | Kind | Factor / affine | Aliases | Status |
|---|---|---|---|---|---|
| `resistance.ohm` | Ω | linear | × 1 | ohm | canonical |
| `resistance.kohm` | kΩ | linear | × 1000.0 | — | canonical |
| `resistance.Mohm` | MΩ | linear | × 1000000.0 | — | canonical |

### `capacitance` — Capacitance (canonical `F`)

| Unit ID | Symbol | Kind | Factor / affine | Aliases | Status |
|---|---|---|---|---|---|
| `capacitance.F` | F | linear | × 1 | — | canonical |
| `capacitance.mF` | mF | linear | × 0.001 | — | canonical |
| `capacitance.uF` | µF | linear | × 1e-06 | uF | canonical |
| `capacitance.nF` | nF | linear | × 1e-09 | — | canonical |

### `charge` — Electric charge (canonical `C`)

| Unit ID | Symbol | Kind | Factor / affine | Aliases | Status |
|---|---|---|---|---|---|
| `charge.C` | C | linear | × 1 | — | canonical |
| `charge.Ah` | Ah | linear | × 3600 | — | canonical |
| `charge.mAh` | mAh | linear | × 3.6 | — | canonical |

### `strain` — Strain (canonical `1`)

| Unit ID | Symbol | Kind | Factor / affine | Aliases | Status |
|---|---|---|---|---|---|
| `strain.one` | 1 | linear | × 1 | — | canonical |
| `strain.micro` | µε | linear | × 1e-06 | ue | canonical |

### `secondMoment` — Second moment of area (canonical `m⁴`)

| Unit ID | Symbol | Kind | Factor / affine | Aliases | Status |
|---|---|---|---|---|---|
| `secondMoment.m4` | m⁴ | linear | × 1 | — | canonical |
| `secondMoment.cm4` | cm⁴ | linear | × 1e-08 | — | canonical |
| `secondMoment.mm4` | mm⁴ | linear | × 1e-12 | — | canonical |
| `secondMoment.in4` | in⁴ | linear | × 4.162314255999999e-07 | — | canonical |

### `stiffness` — Stiffness (canonical `N/m`)

lbf/in factor is lbf/in = 4.4482216152605 / 0.0254 (derived, not a third constant).

| Unit ID | Symbol | Kind | Factor / affine | Aliases | Status |
|---|---|---|---|---|---|
| `stiffness.N_m` | N/m | linear | × 1 | — | canonical |
| `stiffness.N_mm` | N/mm | linear | × 1000.0 | — | canonical |
| `stiffness.lbf_in` | lbf/in | linear | × 175.12683524647636 | — | canonical |

### `massFlow` — Mass flow (canonical `kg/s`)

| Unit ID | Symbol | Kind | Factor / affine | Aliases | Status |
|---|---|---|---|---|---|
| `massFlow.kg_s` | kg/s | linear | × 1 | — | canonical |
| `massFlow.kg_h` | kg/h | linear | × 0.0002777777777777778 | — | canonical |

### `specificHeat` — Specific heat (canonical `J/(kg·K)`)

Included: Gauge studio publishes this family.

| Unit ID | Symbol | Kind | Factor / affine | Aliases | Status |
|---|---|---|---|---|---|
| `specificHeat.J_kg_K` | J/(kg·K) | linear | × 1 | — | canonical |
| `specificHeat.kJ_kg_K` | kJ/(kg·K) | linear | × 1000.0 | — | canonical |

### `thermalConductivity` — Thermal conductivity (canonical `W/(m·K)`)

Included: Gauge studio publishes this family.

| Unit ID | Symbol | Kind | Factor / affine | Aliases | Status |
|---|---|---|---|---|---|
| `thermalConductivity.W_m_K` | W/(m·K) | linear | × 1 | — | canonical |
