# TopolGuard

> **3D Mesh Topology Inspector** — Audit `.obj` meshes for non-manifold edges,
> skinny triangles, n-gons, flipped normals, and more.
> Runs entirely in your browser. Nothing is uploaded.

TopolGuard is a browser-based tool for inspecting the **topology quality** of
3D meshes. It was built to help artists and students verify whether AI-generated
or hand-authored `.obj` files are clean enough for downstream pipelines —
game engines, 3D printing, simulation, or rigging.

---

## Features

- **Health Score** — single 0–100 quality index with A+/A/B/C/D/F grading
- **Seven topology checks** — non-manifold edges, boundary edges, skinny
  triangles, n-gons, degenerate faces, flipped normals, isolated vertices
- **Four view modes** — Wire / Solid / Both / Density heatmap
- **Error-layer overlays** — visualize each issue type directly on the mesh
- **Custom color themes** — recolor overlays on the fly
- **Drag-and-drop** — drop `.obj` files into the viewport
- **Runs 100% client-side** — no upload, no server, no tracking

---

## Pages

TopolGuard is built as three static HTML pages, linked through a shared top
navigation:

| Page | File | Purpose |
|---|---|---|
| **Home** | `index.html` | Landing page with hero and project intro |
| **Manual** | `manual.html` | Full documentation of every topology check |
| **Inspector** | `app.html` | The actual 3D mesh inspector |

---

## Project Structure

```
topolguard/
├─ index.html              # Landing page
├─ manual.html             # Documentation
├─ app.html                # Inspector (main tool)
├─ css/
│  ├─ tokens.css           # Design tokens (dark/light variables)
│  ├─ base.css             # Reset + shared top nav
│  ├─ landing.css          # Landing page styles
│  ├─ manual.css           # Manual page (Unreal-docs style)
│  └─ app.css              # Inspector page styles
├─ js/
│  ├─ theme.js             # Dark/light toggle (landing + manual)
│  ├─ nav.js               # Shared top navigation injection
│  ├─ landing.js           # Wireframe terrain background
│  ├─ manual.js            # Scroll-spy for TOC
│  └─ app.js               # Inspector logic (Three.js + OBJ analysis)
├─ samples/
│  ├─ Good_Low_Poly_Male_body_AI.obj   # Clean AI-generated sample
│  ├─ Bad_Low_Poly_Male_body_AI.obj    # Problematic AI sample (decimated)
│  └─ CREDITS.md                        # Sample provenance & licensing
└─ README.md
```

No build tools. No `npm install`. Just HTML, CSS, and JavaScript files that
run directly in any modern browser.

---

## Running Locally

**Option 1 — Just double-click `index.html`**
Works for the landing and manual pages. The Inspector page may have trouble
loading sample files from `file://` URLs due to browser security — use Option 2
for full functionality.

**Option 2 — Use a simple local server**
If you have Python installed:
```bash
cd topolguard
python -m http.server 8000
```
Then open `http://localhost:8000/` in your browser.

Or use any lightweight dev server you prefer (VS Code Live Server extension
works well).

---

## Deploying to GitHub Pages (with GitHub Desktop)

This is the easiest way to share your TopolGuard online.

### Step 1 — Create the repository on GitHub.com
1. Go to https://github.com/new
2. Repository name: `topolguard` (or any name you want)
3. Set it to **Public** (required for free GitHub Pages)
4. **Do NOT** check any of the "Initialize" options (README, .gitignore, license)
5. Click **Create repository**

### Step 2 — Clone to your computer with GitHub Desktop
1. Open **GitHub Desktop**
2. `File` → `Clone repository`
3. Pick the `topolguard` repo you just created
4. Choose a local folder (remember where!)
5. Click **Clone**

### Step 3 — Copy project files into the cloned folder
1. Open the local folder you just cloned (it should be empty or have only
   a `.git` folder hidden inside)
2. Copy **all** TopolGuard files into it:
   - `index.html`, `manual.html`, `app.html`
   - `css/` folder
   - `js/` folder
   - `samples/` folder
   - `README.md`

### Step 4 — Commit and push with GitHub Desktop
1. Go back to **GitHub Desktop**
2. You should see all the new files listed on the left
3. At the bottom left, write a commit summary: `Initial commit`
4. Click **Commit to main**
5. Click **Push origin** at the top

### Step 5 — Enable GitHub Pages
1. Go to your repo on GitHub.com
2. Click **Settings** (top right of the repo)
3. In the left sidebar, click **Pages**
4. Under **Source**, select **Deploy from a branch**
5. Branch: **main**, folder: **/ (root)**
6. Click **Save**
7. Wait about 1 minute
8. GitHub will show a green banner with your site URL:
   `https://<your-username>.github.io/topolguard/`

Done! Your TopolGuard is now live on the web.

### Making changes later
1. Edit any file locally
2. Open GitHub Desktop — it will show your changes
3. Write a commit message, click **Commit to main**
4. Click **Push origin**
5. Wait ~1 minute for GitHub Pages to rebuild
6. Refresh your site

---

## Credits

### Sample 3D Models
All sample meshes in `samples/` are AI-generated by **[Tripo AI](https://www.tripo3d.ai/)**.
See [`samples/CREDITS.md`](samples/CREDITS.md) for full provenance and
modification notes. No human-authored 3D assets are redistributed in
this repository.

### Libraries
- **[Three.js](https://threejs.org/)** (r128) — 3D rendering engine
- **OBJLoader**, **OrbitControls**, **BufferGeometryUtils** — Three.js examples

### Fonts
- **[JetBrains Mono](https://www.jetbrains.com/lp/mono/)** — monospace
- **[IBM Plex Sans](https://www.ibm.com/plex/)** — sans-serif
- **[VT323](https://fonts.google.com/specimen/VT323)** — pixel display (landing)

### Author
**Yeos** ([@Yeos-Min](https://github.com/Yeos-Min))
Built as a web design coursework project.

---

## License

The TopolGuard source code (HTML/CSS/JS) is released under the **MIT License**.

Sample `.obj` files in `samples/` are used under their respective terms
(see `samples/CREDITS.md`).
