import numpy as np
import random
import os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from abc import ABC, abstractmethod
from Particle import Particle
from collections import deque


class Lattice(ABC):
    def __init__(self, L, T):
        self.L = L  # Lattice size
        self.T = T  # temperature
        self.lattice = self.initialize_lattice()

    def initialize_lattice(self):
        # initialize_lattice with random spin of +1 or -1
        return np.array([[Particle(random.choice([1, -1])) for _ in range(self.L)] 
                         for _ in range(self.L)])

    @abstractmethod
    def get_neighbors(self, i, j):
        # return the neighbor, realized by subclass
        pass
    
    @abstractmethod
    def set_position(self):
        # return the visualize position, realized by subclass
        pass
    
    # return n-close neighbors
    def get_n_neighbors(self, i, j, n):
        
        queue = deque([(i, j, 0)])  # use quene to save the points
        visited = set([(i, j)])     # record those saved points
        neighbors = []              # store the message of neighbors

        while queue:
            x, y, d = queue.popleft()
            if d == n:
                neighbors.append((x, y))  # n would be the final close point
            elif d < n:
                # continue to search if smaller than n
                for nx, ny in self.get_neighbors(x, y):
                    if (nx, ny) not in visited:
                        visited.add((nx, ny))
                        queue.append((nx, ny, d + 1))
        
        return neighbors

    def delta_energy(self, i, j):
        # calculate for the delta_energy change for spin
        particle = self.lattice[i, j]
        neighbors = self.get_neighbors(i, j)
        neighbor_spins = sum(self.lattice[n].spin for n in neighbors)
        return 2 * particle.spin * neighbor_spins
    
    def calc_total_magnetization(self):
        """calculate total magnetization"""
        total = 0
        for i in range(self.L):
            for j in range(self.L):
                total += self.lattice[i, j].spin
        return abs(total)  # 

    def calc_total_energy(self):
        """calculate total lattice energy, 0.5 means the symmetry that the interaction energy has been calculate for twice times"""
        E = 0
        for i in range(self.L):
            for j in range(self.L):
                spin = self.lattice[i, j].spin
                # interaction energy with local energy
                for neighbor in self.get_neighbors(i, j):
                    E -= 0.5 * spin * self.lattice[neighbor].spin
        return abs(E)  # total energy


    def monte_carlo_step(self):
        # one montecarlo step
        for i in range (self.L):
            for j in range(self.L):
                dE = self.delta_energy(i, j)
                if dE < 0 or random.random() < np.exp(-dE / self.T):
                    self.lattice[i, j].flip()


    @abstractmethod
    def generate_image(self, frame, folder):
        pass
    
    
# HexLattice case
class HexLattice(Lattice):
    def get_neighbors(self, i, j):
        # neighbors of the closest, with peroidly boundary conditions
        neighbors = []
        if i % 2 == 0:  # even
            neighbors = [
                ((i-1) % self.L, j), ((i+1) % self.L, j),
                (i, (j-1) % self.L), (i, (j+1) % self.L),
                ((i-1) % self.L, (j-1) % self.L), ((i-1) % self.L, (j+1) % self.L)
            ]
        else:  # odd
            neighbors = [
                ((i-1) % self.L, j), ((i+1) % self.L, j),
                (i, (j-1) % self.L), (i, (j+1) % self.L),
                ((i+1) % self.L, (j-1) % self.L), ((i+1) % self.L, (j+1) % self.L)
            ]
        return neighbors
    
    def set_position(self, transform_factor=0.5):
        x_area = np.zeros(self.L**2)
        y_area = np.zeros(self.L**2)
        color=np.zeros(self.L**2)
        for i in range(self.L):
            for j in range(self.L):
                index = i * self.L + j
                x_area[index] = j + transform_factor * (i % 2)
                y_area[index] = i
                if self.lattice[i][j].spin==1:
                    color[index]=1
                else:
                    color[index]=-1
        return (x_area, y_area,color)

    def generate_image(self, frame, folder,x_area,y_area,colors,diameter=50):
        # generate the visualize results
        if np.sum(colors)>=0:
            colors_s = ['black' if spin == -1 else 'white'
                  for spin in colors]
        else:
            colors_s = ['black' if spin == 1 else 'white'
                  for spin in colors]
        
        fig, ax = plt.subplots(figsize=(12, 12))
        ax.scatter(x_area, y_area, c=colors_s, s=diameter, marker='o', edgecolors='black')
        ax.set_title(f'Temperature: {self.T}, Frame: {frame}')
        ax.set_axis_off()
        plt.savefig(os.path.join(folder, f"T_{self.T}_frame_{frame}.png"))
        plt.close(fig)