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
    
    @abstractmethod
    def set_position(self):
        # 子类必须实现，返回绘图区域对应的x，y坐标
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
    
    def calc_total_magnetization(self):
        """计算整个晶格的磁化，总和除以晶格总点数"""
        total = 0
        for i in range(self.L):
            for j in range(self.L):
                total += self.lattice[i, j].spin
        return abs(total)  # 总磁化，可除以 L*L 得到单位磁化

    def calc_total_energy(self):
        """计算晶格总能量，采用双重循环，每个键只计算一次（用0.5因子避免双计）"""
        E = 0
        for i in range(self.L):
            for j in range(self.L):
                spin = self.lattice[i, j].spin
                # 累加当前点与其所有最近邻的相互作用能
                for neighbor in self.get_neighbors(i, j):
                    E -= 0.5 * spin * self.lattice[neighbor].spin
        return abs(E)  # 总能量


    def monte_carlo_step(self):
        # 执行一个蒙特卡洛步骤
        for i in range (self.L):
            for j in range(self.L):
                dE = self.delta_energy(i, j)
                if dE < 0 or random.random() < np.exp(-dE / self.T):
                    self.lattice[i, j].flip()
        # 以后可以注释掉            
        # print("a whole step has finish")

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
        # # 生成六角晶格的散点图
        # fig, ax = plt.subplots()
        # x, y, colors = [], [], []
        # for i in range(self.L):
        #     for j in range(self.L):
        #         x.append(j + 0.5 * (i % 2))  # 六角晶格的水平偏移
        #         y.append(i)
        #         colors.append('black' if self.lattice[i, j].spin == 1 else 'white')
        # ax.scatter(x, y, c=colors, s=100, marker='o', edgecolors='black')
        # ax.set_title(f'Temperature: {self.T}, Frame: {frame}')
        # ax.set_axis_off()
        # plt.savefig(os.path.join(folder, "T_{}_frame_{}.png".format(self.T,frame)))
        # plt.close(fig)
    
    
        # 根据当前晶格状态生成颜色
        if np.sum(colors)>=0:
            colors_s = ['black' if spin == -1 else 'white'
                  for spin in colors]
        else:
            colors_s = ['black' if spin == 1 else 'white'
                  for spin in colors]
        
        # 绘制散点图
        fig, ax = plt.subplots(figsize=(12, 12))
        ax.scatter(x_area, y_area, c=colors_s, s=diameter, marker='o', edgecolors='black')
        ax.set_title(f'Temperature: {self.T}, Frame: {frame}')
        ax.set_axis_off()
        plt.savefig(os.path.join(folder, f"T_{self.T}_frame_{frame}.png"))
        plt.close(fig)