"""Six-neighbor hexagonal Bravais Ising lattice. Historical HexLattice API retained.

J = k_B = 1. One sweep is N random single-site proposals, not physical time.
"""
import math
from pathlib import Path
import numpy as np
from Particle import Particle


class HexLattice:
    def __init__(self, L, T, seed=None):
        if not isinstance(L, (int, np.integer)) or L < 4 or L % 2:
            raise ValueError('Use an even integer L >= 4 for the offset-row torus')
        if not math.isfinite(T) or T < 0:
            raise ValueError('Temperature must be finite and nonnegative')
        self.L, self.T = int(L), float(T)
        self.rng = np.random.default_rng(seed)
        self.lattice = np.array([[Particle(int(s)) for s in row]
                                 for row in self.rng.choice([-1, 1], (L, L))])

    def get_neighbors(self, i, j):
        L, d = self.L, (1 if i % 2 else -1)
        return [(i, (j-1) % L), (i, (j+1) % L),
                ((i-1) % L, j), ((i-1) % L, (j+d) % L),
                ((i+1) % L, j), ((i+1) % L, (j+d) % L)]

    def get_n_neighbors(self, i, j, n):
        if n < 0: raise ValueError('n must be nonnegative')
        seen, frontier = {(i, j)}, {(i, j)}
        for _ in range(n):
            frontier = {q for p in frontier for q in self.get_neighbors(*p)} - seen
            seen.update(frontier)
        return sorted(frontier)

    def delta_energy(self, i, j):
        return 2*self.lattice[i,j].spin*sum(self.lattice[p].spin for p in self.get_neighbors(i,j))

    def calc_total_magnetization(self):
        """Signed extensive M; use abs explicitly for the order parameter."""
        return sum(p.spin for p in self.lattice.flat)

    def calc_total_energy(self):
        return -.5*sum(self.lattice[i,j].spin*self.lattice[q].spin
                       for i in range(self.L) for j in range(self.L)
                       for q in self.get_neighbors(i,j))

    def attempt_flip(self, i, j, draw=None):
        dE = self.delta_energy(i,j)
        p = 1.0 if dE <= 0 else (math.exp(-dE/self.T) if self.T else 0.0)
        u = self.rng.random() if draw is None else float(draw)
        if not 0 <= u < 1: raise ValueError('Draw must be in [0, 1)')
        accepted = u < p
        if accepted: self.lattice[i,j].flip()
        return dict(delta_energy=dE, probability=p, draw=u, accepted=accepted)

    def monte_carlo_step(self):
        for i,j in self.rng.integers(self.L, size=(self.L*self.L,2)):
            self.attempt_flip(int(i),int(j))

    def set_position(self, transform_factor=.5):
        rows,cols = np.indices((self.L,self.L))
        return ((cols+transform_factor*(rows%2)).ravel(),
                (rows*math.sqrt(3)/2).ravel(),
                np.array([p.spin for p in self.lattice.flat]))

    def generate_image(self, frame, folder, x_area=None, y_area=None, colors=None, diameter=50):
        import matplotlib
        matplotlib.use('Agg')
        import matplotlib.pyplot as plt
        x,y,spins = self.set_position()
        fig,ax = plt.subplots(figsize=(8,7),facecolor='#111722')
        ax.set_facecolor('#111722')
        ax.scatter(x,y,c=np.where(spins>0,'#58c4dd','#e7a26d'),s=diameter)
        ax.set_aspect('equal'); ax.set_axis_off()
        ax.set_title('T = %.2f | sweep %s' % (self.T,frame),color='#e4edf2')
        Path(folder).mkdir(parents=True,exist_ok=True)
        path = Path(folder)/('T_%s_frame_%s.png' % (self.T,frame))
        fig.savefig(path,dpi=150,bbox_inches='tight',facecolor=fig.get_facecolor())
        plt.close(fig)
        return path
