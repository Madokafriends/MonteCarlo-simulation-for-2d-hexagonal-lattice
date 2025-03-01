# Monte Carlo Simulation for 2D Hexagonal Lattice Ising Model
## this introduction is produced by grok3， and the program is in fact still developing

## Overview
Welcome to the Monte Carlo simulation of the Ising model on a 2D hexagonal lattice! This project is hosted on the `develop` branch, where active development and experimentation take place. The Ising model is a classic statistical physics model used to study magnetic properties, with spins of +1 or -1 assigned to lattice sites. This simulation explores how the system evolves at different temperatures, visualized through images and animations.

## Features
- **Hexagonal Lattice**: Implements a 2D hexagonal lattice with periodic boundary conditions.
- **Monte Carlo Method**: Uses the Metropolis-Hastings algorithm to simulate spin dynamics.
- **Temperature Variation**: Supports simulations across a range of temperatures to study phase transitions.
- **Visualization**: Generates PNG images and animated GIFs to show spin configurations over time.
- **Multi-threading**: Leverages multi-threading for efficient simulation of multiple temperatures.

## Project Structure
- **`Lattice.py`**: Defines the `Lattice` and `HexLattice` classes for lattice setup and simulation logic.
- **`Particle.py`**: Implements the `Particle` class for individual spins on the lattice.
- **`main.py`**: Runs the simulation for specified temperatures, saving images and GIFs.


## Requirements
To run this project, you’ll need:
- Python 3.x
- NumPy
- Matplotlib
- ImageIO
- ThreadPoolExecutor (included in Python’s `concurrent.futures`)

Install the dependencies with:
```bash
pip install numpy matplotlib imageio
