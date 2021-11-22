import { FastPath, Parser, ParserOptions } from "prettier";
import { parsers as htmlParsers } from "prettier/parser-html";

export const parsers = {
  angular: wrapParser(htmlParsers.angular),
};

const emptyClassAttribute = () => {
  return htmlParsers.angular.parse(
    `<div class=""></div>`,
    parsers,
    <ParserOptions>{}
  ).children[0].attrs[0];
};

interface HTMLNode {
  children?: HTMLNode[];
  attrMap?: { [key: string]: any };
  attrs?: { name: string; value: any }[];
  value?: string;
  type: string;
}

function wrapParser(parser: Parser<any>): Parser<any> {
  return {
    ...parser,
    parse: transformPostParse(parser.parse),
  };
}

function transformPostParse(parse: Parser<any>["parse"]): Parser<any>["parse"] {
  return (text, parsers, options) =>
    transformRootNode(parse(text, parsers, options));
}

function transformRootNode(node: HTMLNode) {
  transformNode(node);
  return node;
}

let registeredTransform: ((...args: any[]) => any)[] = [];
function registerTransform(transform: (...args: any[]) => any): void {
  registeredTransform.push(transform);
}

function addClasses(
  classAttribute: { name: string; value: any },
  utilities:
    | string[]
    | ((classAttribute: { name: string; value: any }) => {
        name: string;
        value: any;
      })
) {
  classAttribute.value = classAttribute.value
    .split(" ")
    .map((s: string) => s.replace(/\n/g, ""));

  if (typeof utilities === "function") {
    registerTransform((classAttribute: { name: string; value: any }): {
      name: string;
      value: any;
    } => utilities(classAttribute));
  } else {
    classAttribute.value = [...classAttribute.value, ...utilities];
  }

  classAttribute.value = classAttribute.value
    .filter(
      (className: string, index: number, array: string[]) =>
        !!className && array.indexOf(className) === index
    )
    .join(" ");

  return classAttribute;
}

function transformNode(node: HTMLNode): void {
  if (!node.attrs) {
    node.children
      ?.filter((child) => child.type === "element")
      ?.forEach((child) => transformNode(child));
    return;
  }

  node.attrs = node.attrs.reduce(
    (accumulator, attribute) => {
      const classAttributeIndex = accumulator.findIndex(
        (attribute) => attribute.name === "class"
      );
      const classAttribute =
        classAttributeIndex >= 0
          ? accumulator.splice(classAttributeIndex, 1)[0]
          : emptyClassAttribute();

      if (attribute.name.includes("[")) {
        switch (attribute.name.replace("[", "").replace("]", "")) {
          case "fxFlex":
            attribute.name = "[class.flex]";
            return [...accumulator, classAttribute];
          case "fxHide":
            attribute.name = "[class.hidden]";
            return [...accumulator, classAttribute];
          case "fxShow":
            attribute.name = "[class.hidden]";
            attribute.value = `!${attribute.value.replace(/\n/g, "")}`;
            return [...accumulator, classAttribute];
          default:
            return [...accumulator, classAttribute];
        }
      }

      switch (attribute.name) {
        case "fxFlex":
          accumulator.splice(
            accumulator.findIndex((attribute) => attribute.name === "fxFlex"),
            1
          );
          return [...accumulator, addClasses(classAttribute, ["flex"])];
        case "fxFlexFill":
        case "fxFill":
          accumulator.splice(
            accumulator.findIndex(
              (attribute) =>
                attribute.name === "fxFlexFill" || attribute.name === "fxFill"
            ),
            1
          );
          return [
            ...accumulator,
            addClasses(classAttribute, [
              "m-0",
              "w-full",
              "h-full",
              "min-w-full",
              "min-h-full",
            ]),
          ];
        case "fxHide":
          accumulator.splice(
            accumulator.findIndex((attribute) => attribute.name === "fxHide"),
            1
          );
          switch (attribute.value) {
            case "false":
              return [...accumulator, classAttribute];
            default:
              return [...accumulator, addClasses(classAttribute, ["hidden"])];
          }
        case "fxShow":
          accumulator.splice(
            accumulator.findIndex((attribute) => attribute.name === "fxShow"),
            1
          );
          switch (attribute.value) {
            case "false":
              return [...accumulator, addClasses(classAttribute, ["hidden"])];
            default:
              return [...accumulator, classAttribute];
          }
        case "fxFlexAlign":
          accumulator.splice(
            accumulator.findIndex(
              (attribute) => attribute.name === "fxFlexAlign"
            ),
            1
          );
          switch (attribute.value) {
            case "start":
              return [
                ...accumulator,
                addClasses(classAttribute, ["self-start"]),
              ];
            case "center":
              return [
                ...accumulator,
                addClasses(classAttribute, ["self-center"]),
              ];
            case "end":
              return [...accumulator, addClasses(classAttribute, ["self-end"])];
            case "baseline":
              return [
                ...accumulator,
                addClasses(classAttribute, ["self-baseline"]),
              ];
            case "stretch":
              return [
                ...accumulator,
                addClasses(classAttribute, ["self-stretch"]),
              ];
            default:
              return [...accumulator, classAttribute];
          }
        case "fxLayout":
          accumulator.splice(
            accumulator.findIndex((attribute) => attribute.name === "fxLayout"),
            1
          );

          const [directionValue, optionalValue] =
            attribute.value && attribute.value.includes(" ")
              ? attribute.value.split(" ")
              : [attribute.value ?? "row", null];

          const addDirectionUtilities = (
            classAttribute: { name: string; value: any },
            value: string
          ) => {
            switch (value) {
              case "row":
                return addClasses(classAttribute, ["flex"]);
              case "column":
                return addClasses(classAttribute, ["flex", "flex-col"]);
              case "row-reverse":
                return addClasses(classAttribute, ["flex", "flex-row-reverse"]);
              case "column-reverse":
                return addClasses(classAttribute, ["flex", "flex-col-reverse"]);
              default:
                return classAttribute;
            }
          };

          const addOptionalUtilities = (
            classAttribute: { name: string; value: any },
            value: string
          ) => {
            switch (value) {
              case "wrap":
                return addClasses(classAttribute, ["flex-wrap"]);
              case "inline":
                return addClasses(
                  classAttribute,
                  (classAttribute: {
                    name: string;
                    value: any;
                  }): { name: string; value: any } => {
                    classAttribute.value = classAttribute.value
                      .split(" ")
                      .map((utility: string) =>
                        utility === "flex" ? "inline-flex" : utility
                      )
                      .join(" ");

                    return classAttribute;
                  }
                );
              default:
                return classAttribute;
            }
          };

          return [
            ...accumulator,
            addOptionalUtilities(
              addDirectionUtilities(classAttribute, directionValue),
              optionalValue
            ),
          ];
        case "fxLayoutAlign":
          accumulator.splice(
            accumulator.findIndex(
              (attribute) => attribute.name === "fxLayoutAlign"
            ),
            1
          );

          const [mainAxisValue, crossAxisValue] = attribute.value.includes(" ")
            ? attribute.value.split(" ")
            : [attribute.value, attribute.value];

          const addMainAxisAlignUtilities = (
            classAttribute: { name: string; value: any },
            value: string
          ) => {
            switch (value) {
              case "start":
              case "flex-start":
                return addClasses(classAttribute, ["flex", "justify-start"]);
              case "center":
                return addClasses(classAttribute, ["flex", "justify-center"]);
              case "end":
              case "flex-end":
                return addClasses(classAttribute, ["flex", "justify-end"]);
              case "space-around":
                return addClasses(classAttribute, ["flex", "justify-around"]);
              case "space-between":
                return addClasses(classAttribute, ["flex", "justify-between"]);
              case "space-evenly":
                return addClasses(classAttribute, ["flex", "justify-evenly"]);
              default:
                return classAttribute;
            }
          };

          const addCrossAxisAlignUtilities = (
            classAttribute: { name: string; value: any },
            value: string
          ) => {
            switch (value) {
              case "start":
              case "flex-start":
                return addClasses(classAttribute, [
                  "flex",
                  "items-start",
                  "content-start",
                ]);
              case "center":
                return addClasses(classAttribute, [
                  "flex",
                  "items-center",
                  "content-center",
                ]);
              case "end":
              case "flex-end":
                return addClasses(classAttribute, [
                  "flex",
                  "items-end",
                  "content-end",
                ]);
              case "space-around":
                return addClasses(classAttribute, ["flex", "content-around"]);
              case "space-between":
                return addClasses(classAttribute, ["flex", "content-between"]);
              case "stretch":
                return addClasses(
                  classAttribute,
                  (classAttribute: {
                    name: string;
                    value: any;
                  }): { name: string; value: any } => {
                    const utilities = classAttribute.value.split(" ");

                    if (
                      utilities.includes("flex-col") ||
                      utilities.includes("flex-col-reverse")
                    ) {
                      classAttribute.value = [...utilities, "max-h-full"].join(
                        " "
                      );
                    } else {
                      classAttribute.value = [...utilities, "max-w-full"].join(
                        " "
                      );
                    }

                    return classAttribute;
                  }
                );
              case "baseline":
                return addClasses(classAttribute, ["flex", "items-baseline"]);
              default:
                return classAttribute;
            }
          };

          return [
            ...accumulator,
            addMainAxisAlignUtilities(
              addCrossAxisAlignUtilities(classAttribute, crossAxisValue),
              mainAxisValue
            ),
          ];
        default:
          return [...accumulator, classAttribute];
      }
    },
    <{ name: string; value: any }[]>[...node.attrs]
  );

  const classAttributeIndex = node.attrs.findIndex(
    (attribute) => attribute.name === "class"
  );

  if (classAttributeIndex >= 0) {
    const classAttribute = node.attrs.splice(classAttributeIndex, 1)[0];

    registeredTransform.forEach((transform) => transform(classAttribute));
    registeredTransform = [];

    node.attrs.push(classAttribute);
  }

  node.attrs = node.attrs.filter(
    (attribute) => attribute.name !== "class" || !!attribute.value
  );

  node.children
    ?.filter((child) => child.type === "element")
    ?.forEach((child) => transformNode(child));
}
