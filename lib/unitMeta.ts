/** Teacher-facing unit names, grouped into the four Cambridge maths strands. */
export interface UnitMeta {
  unit: number;
  name: string;
}

export interface UnitCategory {
  id: "number" | "algebra" | "geometry" | "statistics";
  title: string;
  units: UnitMeta[];
}

export const UNIT_CATEGORIES: UnitCategory[] = [
  {
    id: "number",
    title: "Number",
    units: [
      { unit: 1, name: "Number and calculation" },
      { unit: 3, name: "Decimals, percentages and rounding" },
      { unit: 8, name: "Fractions" },
      { unit: 11, name: "Ratio and proportion" },
    ],
  },
  {
    id: "algebra",
    title: "Algebra",
    units: [
      { unit: 2, name: "Expressions and formulae" },
      { unit: 4, name: "Equations and inequalities" },
      { unit: 9, name: "Sequences and functions" },
      { unit: 10, name: "Graphs" },
    ],
  },
  {
    id: "geometry",
    title: "Geometry and measure",
    units: [
      { unit: 5, name: "Angles" },
      { unit: 7, name: "Shapes and measurements" },
      { unit: 13, name: "Position and transformation" },
      { unit: 14, name: "Volume, surface area and symmetry" },
    ],
  },
  {
    id: "statistics",
    title: "Statistics and probability",
    units: [
      { unit: 6, name: "Statistical investigations" },
      { unit: 12, name: "Probability" },
      { unit: 15, name: "Interpreting and discussing results" },
    ],
  },
];

export const UNIT_NAME: Record<number, string> = Object.fromEntries(
  UNIT_CATEGORIES.flatMap((c) => c.units.map((u) => [u.unit, u.name])),
);
