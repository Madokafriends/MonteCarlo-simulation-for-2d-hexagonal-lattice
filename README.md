<<<<<<< HEAD
# Ising Model Monte Carlo Simulation on a Hexagonal Lattice

This document introduces a Python-based Monte Carlo simulation of the [Ising model](https://en.wikipedia.org/wiki/Ising_model) implemented on a hexagonal lattice. The Ising model is a fundamental mathematical model in statistical mechanics used to study magnetic properties and phase transitions in ferromagnetic systems. This simulation explores the behavior of spins on a hexagonal lattice under varying temperatures, providing both visualizations and statistical analyses.

In this model, unlike in square lattice, the interaction terms of the nearest neighbors in hexagonal would be higher than those in square, which results in a higher phase transistion temperature.

---

## Overview

The simulation models a 2D hexagonal lattice where each site hosts a particle with a spin of either +1 or -1. Using the Monte Carlo method with the Metropolis-Hastings algorithm, the code simulates the evolution of spin configurations and computes key physical properties such as magnetization, energy, specific heat, and susceptibility across a range of temperatures.

The simulation has two primary objectives:
1. **Visualization**: Generate animated GIFs showing the lattice's evolution at specific temperatures.
2. **Statistical Analysis**: Calculate and plot average thermodynamic quantities to study phase transitions.

---

## Files and Structure

The codebase is organized into three main Python files:

- **`main.py`**: The entry point of the simulation. It defines parameters, runs Monte Carlo steps, generates visualizations, and produces statistical plots.
- **`Lattice.py`**: Defines an abstract `Lattice` base class and a `HexLattice` subclass, handling lattice initialization, neighbor calculations, and visualization for the hexagonal structure. It is ok to finish it as a `Square Lattice` if you rewrite in abstract methods.
- **`Particle.py`**: Implements the `Particle` class, representing individual spins with methods to flip their states.

---

## Simulation Details

### Lattice Initialization
- The lattice is initialized as a 2D array of `Particle` objects, each assigned a random spin of +1 or -1.
- The `HexLattice` class implements a hexagonal grid with periodic boundary conditions, ensuring the simulation mimics an infinite system.

### Monte Carlo Steps
- Each Monte Carlo step iterates over all lattice sites, attempting to flip each spin based on the Metropolis-Hastings algorithm:
  - Compute the energy change (\(\Delta E\)) due to flipping a spin, based on interactions with its six neighbors in the hexagonal lattice.
  - **Acceptance Rules**:
    - If \(\Delta E < 0\), accept the flip.
    - If \(\Delta E \geq 0\), accept with probability \(e^{-\Delta E / T}\), where \(T\) is the temperature.
- The `HexLattice.get_neighbors` method defines the six neighbors for each site, adjusted for even and odd rows to reflect the hexagonal geometry.

### Visualization
- For each temperature in the predefined list, the simulation:
  - Runs Monte Carlo steps beyond the initial `steps_per_temp` to capture evolution.
  - Saves 48 snapshots as PNG images in a folder (e.g., `figure_v/T_{T}`).
  - Compiles these images into a GIF (e.g., `gif_v/T_{T}.gif`) using `imageio`.
- Spins are visualized using a scatter plot:
  - Positions are offset to reflect the hexagonal structure.
  - Colors indicate spin states: black and white for +1 and -1 (or vice versa, depending on the majority spin).

### Statistical Analysis
- For a range of temperatures (`T_array`), the simulation computes:
  - **Average Magnetization (\(M\))**: \(\langle M \rangle = \frac{1}{L^2} \sum \text{spins}\).
  - **Average Energy (\(E\))**: \(\langle E \rangle = -\frac{1}{L^2} \sum_{<i,j>} s_i s_j\), normalized by lattice size.
  - **Specific Heat (\(C_v\))**: \(C_v = \frac{\langle E^2 \rangle - \langle E \rangle^2}{T^2}\).
  - **Magnetic Susceptibility (\(\chi\))**: \(\chi = \frac{\langle M^2 \rangle - \langle M \rangle^2}{T}\).
- These quantities are plotted against temperature in a 2x2 grid saved as `monte_carlo_results.png`.

---

## How to Run the Simulation
It is ok to put all the files in one folder and then run the main.py file. But you need to care about the output path of the file. 

### Prerequisites
Install the required Python packages, the command use `pip install` like:
```bash
pip install numpy matplotlib imageio
```

### Output
Statistical Plots: A single PNG file (monte_carlo_results.png) with four subplots
Gif: Stored in gif_v (e.g., T_2.0.gif), showing spin evolution at some temperature
Fig: each figure for gif is also tracked in a figure_v folder.

---
## Notes
This simulation offers an accessible way to explore the Ising model's behavior on a hexagonal lattice, making it a valuable tool for studying phase transitions and statistical mechanics computationally. Feel free to adapt the code for further experimentation!


