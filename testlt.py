"""test for image in suitable size"""
from Particle import Particle
from Lattice import HexLattice
from concurrent.futures import ThreadPoolExecutor
import numpy as np
import os
# 参数设置
L = 30  # 晶格大小
temperatures = [0.5, 1.0, 2.0, 3.0, 4.0]  # 不同温度
steps_per_temp = 1000  # 每个温度的蒙特卡洛步数
frames_per_temp = 24  # 每个温度保存的帧数
T=np.linspace(1,8,5)

def MonCa_statistic_calculate(T):
    print("work")
    lattice2 = HexLattice(L, T)
    magnetizations = []  # 存放每帧的磁化
    energies = []        # 存放每帧的能量
    steps=10
    for i in range(steps):
        
        # 统计数据：注意归一化除以总点数（L*L）
        lattice2.monte_carlo_step()
        M = lattice2.calc_total_magnetization() / (L * L)
        E = lattice2.calc_total_energy() / (L * L)
        magnetizations.append(M)
        energies.append(E)
        
    M_avg = np.mean(magnetizations)
    E_avg = np.mean(energies)
    M2_avg = np.mean(np.array(magnetizations)**2)
    E2_avg = np.mean(np.array(energies)**2)
    
    # 比热 Cv 根据能量波动计算 (这里单位为每自旋)
    Cv = (E2_avg - E_avg**2) / (T**2)
    # Cm 表示磁化率，根据磁化波动计算（这里简单用 (⟨M²⟩-⟨M⟩²)/T 作为近似）
    Cm = (M2_avg - M_avg**2) / T
    
    return (T, M_avg, E_avg, Cv, Cm)

if __name__ == '__main__':
    
    # fig_folder = os.path.join('figure_v', f'T_{0.5}')
    # os.makedirs(fig_folder, exist_ok=True)
    # latticehex = HexLattice(L, 0.5)
    # [xcondit,ycondit,colors]=latticehex.set_position()

    # latticehex.generate_image(1,fig_folder,xcondit,ycondit,colors,diameter=60)

    with ThreadPoolExecutor() as executor:
            # 提交所有温度的计算任务
            steps = [steps_per_temp] * len(T)  # 创建一个长度为 40 的列表，每个元素都是 1000
            results = list(executor.map(MonCa_statistic_calculate, T))
            

    T_vals = [r[0] for r in results]
    M_avg_vals = [r[1] for r in results]
    E_avg_vals = [r[2] for r in results]
    Cv_vals = [r[3] for r in results]
    Cm_vals = [r[4] for r in results]
    print(T_vals)
    print(M_avg_vals)