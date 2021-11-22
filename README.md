# prettier-plugin-flex-layout-to-tailwind

## Migrate from @angular/flex-layout to tailwind CSS utility classes

This package should work out of the box with prettier. However you will probably want to migrate all of your files in one go.

To do so follow the following steps :

- Add prettier and prettier-plugin-flex-layout-to-tailwind as a project dev dependencies :

```
npm i prettier @AODocs/prettier-plugin-flex-layout-to-tailwind -D
```

- Then, add the following script in your package.json :

```
"migrate:fx": "prettier --config {prettier_config_path} --write ."
```

- Finally :

```
npm run migrate:fx
```
