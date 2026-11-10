# Mockup

The screens of the design mockup (claude.ai artifact
<https://claude.ai/artifact/DPwC4irUVMArNCA7E1Fg3Z>, page "shadcn"), copied here so they can be read
without access to the artifact.

Each `.dc.html` file is one screen: plain HTML with inline styles, the shadcn colour tokens as CSS
variables at the top (`.t` light, `.t.dark` dark), `{{…}}` placeholders and `<sc-for>` / `<sc-if>`
for lists and conditions, and the sample data in the `<script type="text/x-dc">` block at the end.
They do not render on their own (they need the artifact's runtime); read them for layout, spacing,
copy and the sample data.

| File | Screen |
|---|---|
| `Main.dc.html` | Torrent list: sidebar, header, data table, footer |
| `Details.dc.html`, `Dateien.dc.html`, `Peers.dc.html`, `Tracker.dc.html` | Details sheet, one file per tab |
| `Hinzufuegen.dc.html` | "Torrent hinzufügen" dialog |
| `Kategorien.dc.html` | Categories and tags dialog |
| `Kontextmenue.dc.html` | Context menu for a selection, "Erweitert" submenu, speed menu |
| `Einstellungen.dc.html` | Settings, section "Downloads" |
| `Suche.dc.html` | Search |
| `RSS.dc.html`, `Regeln.dc.html` | RSS feeds and the auto-downloader rule editor |
| `PhoneListe.dc.html`, `PhoneDetail.dc.html` | Phone list and details |
