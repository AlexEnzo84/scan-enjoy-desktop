# Scan & Enjoy Admin Desktop

Aplicația deschide panoul administrativ Scan & Enjoy și folosește FFmpeg nativ pentru procesarea rapidă a filmărilor. Nu este un instrument separat de încărcare: utilizatorul completează liceul/universitatea, facultatea/specializarea, clasa/grupa și promoția în același panou, apoi alege folderul clasei.

## Cum ajung fișierele în albumul corect

Panoul web creează mai întâi un album cu ID unic. Aplicația desktop comprimă local fiecare video, îl returnează aceleiași pagini, iar pagina îl încarcă împreună cu fotografia pereche la cheia:

`archive/albums/{albumId}/pairs/{număr}`

Numele `IMG (1)` și `VIDEO (1)` se pot repeta în clase diferite deoarece separarea se face prin `albumId`, nu prin numele fișierului.

## Instalatoare generate automat

Workflow-ul GitHub construiește:

- Windows x64: instalator `.exe`;
- Mac Intel: imagine `.dmg`;
- Mac Apple Silicon: imagine `.dmg`.

La fiecare rulare, cele trei fișiere sunt publicate într-o versiune GitHub Releases și rămân disponibile pentru descărcare.

## Rulare locală pentru dezvoltare

```bash
npm ci
npm start
```

## Compilare manuală

```bash
npm run build:windows
npm run build:mac-intel
npm run build:mac-apple
```

Comanda Windows trebuie rulată pe Windows, iar comenzile Mac pe arhitectura Mac corespunzătoare. Instalatoarele apar în `dist/`. Versiunea inițială este nesemnată; Windows SmartScreen și macOS Gatekeeper pot afișa avertismente până când sunt adăugate certificatele Microsoft și Apple.
