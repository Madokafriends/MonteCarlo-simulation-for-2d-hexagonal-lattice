# Contributing

Use an issue to describe a reproducible bug or propose a change to the simulation, presentation, or numerical methods. For a bug, include the lattice geometry, size, temperature, field, seed, and the sequence of controls used.

## Development

The browser application is static HTML, CSS, and JavaScript. Open `demo/index.html` directly or serve the repository with `python -m http.server 8000` and visit `/demo/`.

Run the existing checks before opening a pull request:

```bash
node --test tests/*.test.cjs
python -m pip install -r requirements.txt
python -B -m unittest discover -s tests -p "test_*.py" -v
```

Keep numerical updates separate from display animation. Changes to the model should be checked against an independent calculation, an exact limit, or a known equilibrium result. For interface changes, verify both lattice geometries, parameter controls, single stepping, and the equilibrium figures in a browser.

Do not commit generated samples, local environments, bytecode, access tokens, or personal paths. Historical result images are retained as provenance; new numerical results should record their parameters and verification method.

## Pull requests

Explain the problem, the resulting behaviour, and the checks performed. Keep changes focused and distinguish finite-system observations from thermodynamic-limit claims. Document any AI assistance accurately; contributors remain responsible for reviewing their changes.
