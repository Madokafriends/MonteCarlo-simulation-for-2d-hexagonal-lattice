"""Reproducible equilibrium sampling companion to the interactive demo."""
import argparse
import csv
from pathlib import Path
import numpy as np
from Lattice import HexLattice


def thermodynamics(energies, magnetizations, n_sites, temperature):
    """E and signed M are extensive; returned observables are per spin."""
    if temperature <= 0: raise ValueError('Fluctuation estimators need T > 0')
    E,M = np.asarray(energies,dtype=float),np.asarray(magnetizations,dtype=float)
    if not E.size or E.shape != M.shape or n_sites <= 0: raise ValueError('Invalid samples')
    return dict(energy_per_spin=float(E.mean()/n_sites),
                abs_magnetization=float(np.abs(M).mean()/n_sites),
                specific_heat=float(E.var()/(n_sites*temperature**2)),
                susceptibility=float(M.var()/(n_sites*temperature)))


def sample(T, size=16, burn_in=300, samples=300, spacing=5, seed=42):
    if T <= 0 or burn_in < 0 or samples < 1 or spacing < 1: raise ValueError('Invalid settings')
    model = HexLattice(size,T,seed)
    for _ in range(burn_in): model.monte_carlo_step()
    E,M = [],[]
    for _ in range(samples):
        for _ in range(spacing): model.monte_carlo_step()
        E.append(model.calc_total_energy()); M.append(model.calc_total_magnetization())
    return dict(temperature=T,**thermodynamics(E,M,size*size,T))


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--size',type=int,default=16)
    p.add_argument('--temperatures',type=float,nargs='+',default=[1.5,3.2,3.64,4.2,6.0])
    p.add_argument('--burn-in',type=int,default=300)
    p.add_argument('--samples',type=int,default=300)
    p.add_argument('--spacing',type=int,default=5)
    p.add_argument('--seed',type=int,default=42)
    p.add_argument('--out',type=Path,default=Path('output/equilibrium.csv'))
    a=p.parse_args()
    results=[sample(t,a.size,a.burn_in,a.samples,a.spacing,a.seed+i) for i,t in enumerate(a.temperatures)]
    a.out.parent.mkdir(parents=True,exist_ok=True)
    with a.out.open('w',newline='',encoding='utf-8') as f:
        w=csv.DictWriter(f,fieldnames=results[0].keys());w.writeheader();w.writerows(results)
    print('Wrote',a.out)
    print('Finite-size correlated samples: use independent seeds and error analysis for research.')


if __name__ == '__main__': main()
