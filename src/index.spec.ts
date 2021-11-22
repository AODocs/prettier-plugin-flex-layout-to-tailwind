import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import * as prettier from "prettier";
import * as OrganizeAttributes from "./index";

const testFolder = join(__dirname, "tests");

describe("Codemod tests", () => {
  const tests = readdirSync(testFolder);
  const extension = "component.html";

  tests.forEach((test) =>
    it(test, () => {
      const path = join(testFolder, test);
      const inputPath = join(path, `input.${extension}`);
      const expectedPath = join(path, `expected.${extension}`);

      const input = readFileSync(inputPath).toString();
      const expected = readFileSync(expectedPath).toString();

      const options: prettier.Options = {
        filepath: inputPath,
        plugins: [OrganizeAttributes],
      };
      const format = () => prettier.format(input, options);

      const expectedError = expected.match(/Error\("(?<message>.*)"\)/)?.groups
        ?.message;

      if (expectedError) {
        expect(format).toThrow(expectedError);
      } else {
        expect(format()).toEqual(expected);
      }
    })
  );
});
