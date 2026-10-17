# Physics and numerical methods

## Geometry and boundary conditions

The hexagonal Bravais lattice has six equidistant nearest neighbours. Alternating rows are offset by half a horizontal lattice spacing; the row spacing is $\sqrt3/2$. The square lattice has four nearest neighbours along the coordinate axes. Both models use periodic boundaries and even linear sizes. Spins occupy the centres of the displayed cells.

## Metropolis sampling

With $J=k_B=1$, the energy change for reversing spin $s_i$ is

$$
\Delta E=2s_i\left(\sum_{j\in\mathrm{nn}(i)}s_j+h\right),\qquad
p_{\mathrm{accept}}=\min(1,e^{-\Delta E/T}).
$$

At $T=0$, non-increasing-energy moves are accepted and uphill moves are rejected. One sweep consists of $N$ single-spin proposals, selected independently with replacement. The optimized acceptance table is tested against individual proposals with the same random stream.

The live application uses Metropolis updates for every preset, single step, and continuous run. Numerical utility modules also retain separately tested methods that are not exposed by the interactive controls.

Changing the field at fixed configuration changes the energy by $-\Delta h\,M$. Switching lattice geometry rebuilds the neighbours and recomputes the energy while preserving spin values, temperature, field, and random-generator state. Both operations start a new observation segment.

## Display and observation conventions

- $M=\sum_i s_i$ is extensive magnetization; the plotted magnetization is $m=M/N$.
- Energy is displayed as $E/(NJ)$, including the field contribution.
- The antialigned-bond fraction is computed from the exchange energy and the coordination number.
- Trajectories contain the latest 240 recorded observations.
- The left-to-right animation reveals net changes from an already-completed sweep. It does not change spins, advance the generator, or add samples.

The ordered preset starts aligned at $T=1.5$ and performs two sweeps. The critical preset starts random at the selected critical temperature and performs 120 sweeps. The disordered preset starts random at $T=7$ and performs three sweeps. These preparations are illustrative starting configurations, not guarantees of equilibrium.

## Infinite-lattice spontaneous magnetization

For the hexagonal Bravais lattice, define $u=e^{-4/T}$. Below $T_c=4/\ln3$,

$$
m_0(T)=\left(\frac{1+u}{1-u}\right)^{3/8}
\left(\frac{1-3u}{1+3u}\right)^{1/8}.
$$

For the square lattice, below $T_c=2/\ln(1+\sqrt2)$,

$$
m_0(T)=\left[1-\sinh^{-4}(2/T)\right]^{1/8}.
$$

In both cases $m_0(0)=1$ and $m_0(T)=0$ for $T\ge T_c$. The curves are the exact **zero-field** result. Spontaneous magnetization takes the thermodynamic limit before $h\to0^+$; it is not the signed average of a finite zero-field system.

## Exact finite-system distribution

The distribution panel uses a periodic 4 × 4 lattice with the selected geometry. All $2^{16}=65,536$ spin configurations are enumerated. A Gray-code traversal changes one spin between consecutive states, allowing incremental updates of bond energy and magnetization. Degeneracies $g(E_0,M)$ are cached separately for each geometry.

At the selected $T>0$ and $h$,

$$
P(M)=\frac{\sum_{E_0}g(E_0,M)e^{-(E_0-hM)/T}}
{\sum_{E_0,M'}g(E_0,M')e^{-(E_0-hM')/T}}.
$$

At zero temperature, probabilities are restricted to the ground-state ensemble. This distribution is independent of the live trajectory and remains a 16-spin calculation even when the interactive lattice is larger.

## Symmetry and phase transitions

The zero-field Hamiltonian has global $\mathbb Z_2$ spin-inversion symmetry. Its thermal transition is continuous, with magnetization exponent $\beta=1/8$. A finite equilibrium ensemble at $h=0$ remains symmetric and has $\langle m\rangle=0$, including below the infinite-lattice critical temperature.

A fixed nonzero field explicitly breaks the symmetry and rounds the thermal transition. In the thermodynamic limit at $T<T_c$, crossing $h=0$ produces a discontinuity in magnetization; this coexistence line terminates at the critical point. Finite lattices have no true thermodynamic singularity.

## Python estimators

For extensive energy $E$ and signed magnetization $M$, the Python companion reports

$$
\frac{C}{N}=\frac{\operatorname{Var}(E)}{NT^2},\qquad
\frac{\chi}{N}=\frac{\operatorname{Var}(M)}{NT}.
$$

It also reports $\langle E\rangle/N$ and $\langle|M|\rangle/N$. Susceptibility uses signed $M$, not $|M|$. The current Python companion supports the zero-field hexagonal Bravais model; square geometry and finite fields are supported by the browser implementation.

## Scope and limitations

The spins are classical effective easy-axis moments. The model does not describe electron trajectories and omits dipolar interactions, disorder, and pinning. Metropolis sweeps are not calibrated physical time; rapid parameter changes can produce lag from incomplete equilibration. Near the critical point, local Metropolis updates exhibit critical slowing down.

Research estimates require independent seeds, equilibration checks, autocorrelation-aware uncertainties, and finite-size analysis. The browser is an explanatory simulation with exact reference calculations, not a substitute for these procedures.

Sources are listed in the [README](../README.md#references).
