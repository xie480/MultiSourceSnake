import { createEmptyGrid, getColor, setColor } from "@snk/types/grid";
import type { Color } from "@snk/types/grid";
import { createSnakeFromCells } from "@snk/types/snake";
import { step } from "../step";

it("reports a cell exactly once when the snake eats it", () => {
  const grid = createEmptyGrid(1, 1);
  setColor(grid, 0, 0, 2 as Color);
  const snake = createSnakeFromCells([{ x: 0, y: 0 }]);
  const stack: Color[] = [];

  expect(step(grid, stack, snake)).toBe(2);
  expect(getColor(grid, 0, 0)).toBe(0);
  expect(step(grid, stack, snake)).toBeNull();
  expect(stack).toEqual([2]);
});
