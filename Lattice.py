import numpy as np
import random
import os
from abc import ABC, abstractmethod
from Particle import Particle
from collections import deque


class Lattice(ABC):
    def __init__(self, L, T):
        self.L = L  # 晶格大小
        self.T = T  # 温度
        self.lattice = self.initialize_lattice()

    def initialize_lattice(self):
        # 初始化晶格，每个位置随机分配自旋 +1 或 -1
        return np.array([[Particle(random.choice([1, -1])) for _ in range(self.L)] 
                         for _ in range(self.L)])

    @abstractmethod
    def get_neighbors(self, i, j):
        # 子类必须实现，返回指定位置的最近邻
        pass
    
    # 新增方法，返回 n 近邻
    def get_n_neighbors(self, i, j, n):
        """返回距离为 n 的所有邻居点"""
        queue = deque([(i, j, 0)])  # 队列保存 (x, y, 距离)
        visited = set([(i, j)])     # 记录已访问的点
        neighbors = []              # 存储距离为 n 的邻居

        while queue:
            x, y, d = queue.popleft()
            if d == n:
                neighbors.append((x, y))  # 距离达到 n，加入结果
            elif d < n:
                # 获取当前点的最近邻，继续扩展
                for nx, ny in self.get_neighbors(x, y):
                    if (nx, ny) not in visited:
                        visited.add((nx, ny))
                        queue.append((nx, ny, d + 1))
        
        return neighbors

    def delta_energy(self, i, j):
        # 计算翻转指定位置自旋时的能量变化
        particle = self.lattice[i, j]
        neighbors = self.get_neighbors(i, j)
        neighbor_spins = sum(self.lattice[n].spin for n in neighbors)
        return 2 * particle.spin * neighbor_spins

    def monte_carlo_step(self):
        # 执行一个蒙特卡洛步骤
        for i in range (self.L):
            for j in range(self.L):
                dE = self.delta_energy(i, j)
                if dE < 0 or random.random() < np.exp(-dE / self.T):
                    self.lattice[i, j].flip()

    @abstractmethod
    def generate_image(self, frame, folder):
        # 子类必须实现，生成当前状态的可视化图像
        pass

class HexLattice(Lattice):
    def get_neighbors(self, i, j):
        # 返回六角晶格的六个最近邻（周期性边界条件）
        neighbors = []
        if i % 2 == 0:  # 偶数行
            neighbors = [
                ((i-1) % self.L, j), ((i+1) % self.L, j),
                (i, (j-1) % self.L), (i, (j+1) % self.L),
                ((i-1) % self.L, (j-1) % self.L), ((i-1) % self.L, (j+1) % self.L)
            ]
        else:  # 奇数行
            neighbors = [
                ((i-1) % self.L, j), ((i+1) % self.L, j),
                (i, (j-1) % self.L), (i, (j+1) % self.L),
                ((i+1) % self.L, (j-1) % self.L), ((i+1) % self.L, (j+1) % self.L)
            ]
        return neighbors

    def generate_image(self, frame, folder):
        # 生成六角晶格的散点图
        import matplotlib.pyplot as plt
        fig, ax = plt.subplots()
        x, y, colors = [], [], []
        for i in range(self.L):
            for j in range(self.L):
                x.append(j + 0.5 * (i % 2))  # 六角晶格的水平偏移
                y.append(i)
                colors.append('black' if self.lattice[i, j].spin == 1 else 'white')
        ax.scatter(x, y, c=colors, s=100, marker='o', edgecolors='black')
        ax.set_title(f'Temperature: {self.T}, Frame: {frame}')
        ax.set_axis_off()
        plt.savefig(os.path.join(folder, "T_{}_frame_{}.png".format(self.T,frame)))
        plt.close(fig)
