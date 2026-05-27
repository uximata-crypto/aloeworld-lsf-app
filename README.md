# Aloeworld | App Modelização LSF V5.8

App React/Vite para modelização preliminar LSF.

## Inclui

- Editor de perímetro;
- Paredes interiores;
- Portas e janelas;
- Alpendres;
- Planta 2D;
- Vista isométrica;
- Vista 3D estrutural;
- Mapa técnico de aço;
- Exportação TXT e DXF;
- Impressão/PDF.

## Testar localmente

```bash
npm install
npm run dev
```

## Publicar na Vercel

1. Crie um repositório no GitHub.
2. Faça upload destes ficheiros.
3. Vá a Vercel → New Project.
4. Importe o repositório.
5. Framework: Vite.
6. Build Command: `npm run build`.
7. Output Directory: `dist`.
8. Deploy.

## Estrutura

```txt
index.html
package.json
src/
  App.jsx
  main.jsx
  styles.css
```

Nota: esta app faz estimativas preliminares. O projeto estrutural final deve ser validado por técnico habilitado.
