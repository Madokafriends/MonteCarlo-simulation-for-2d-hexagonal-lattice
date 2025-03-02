import os
import numpy as np
import imageio
import matplotlib.pyplot as plt
from concurrent.futures import ThreadPoolExecutor
from Lattice import HexLattice
from Particle import Particle

# 参数设置
L = 30  # 晶格大小
temperatures = [0.5, 1.0, 2.0, 3.0, 4.0, 10.0]  # 不同温度
steps_per_temp = 2000  # 每个温度的蒙特卡洛步数
frames_per_temp = 48  # 每个温度保存的帧数
steps=1000 #统计数据对应的montecarlo步数

def process_temperature(T):
    # 处理指定温度的模拟
    lattice = HexLattice(L, T)
    # 蒙特卡洛模拟达到热平衡
    for _ in range(steps_per_temp):
        lattice.monte_carlo_step()
    # 创建图像文件夹
    fig_folder = os.path.join('figure_v', f'T_{T}')
    os.makedirs(fig_folder, exist_ok=True)
    # 保存最后24个状态的图像
    
    images = []
    # magnetizations = []  # 存放每帧的磁化
    # energies = []        # 存放每帧的能量
    
    for frame in range(frames_per_temp):
        # for _ in range(steps_per_temp // frames_per_temp):
            # print(frame)
            lattice.monte_carlo_step()
            [xcondit,ycondit,colors]=lattice.set_position()
            lattice.generate_image(frame, fig_folder,xcondit,ycondit,colors,diameter=60)
            images.append(os.path.join(fig_folder, f"T_{T}_frame_{frame}.png"))
    # 生成GIF
    gif_path = os.path.join('gif_v', f'T_{T}.gif')
    with imageio.get_writer(gif_path, mode='I', duration=0.5) as writer:
        for img in images:
            writer.append_data(imageio.imread(img))

def MonCa_statistic_calculate(T):
    lattice2 = HexLattice(L, T)
    steps=5000
    magnetizations = np.zeros(steps) # 存放每帧的磁化
    energies = np.zeros(steps)      # 存放每帧的能量
    
    
    for i in range(steps):
        
        # 统计数据：注意归一化除以总点数（L*L）
        lattice2.monte_carlo_step()
        M = lattice2.calc_total_magnetization() / (L * L)
        E = lattice2.calc_total_energy() / (L * L)
        magnetizations[i]=M
        energies[i]=E
        
    M_avg = np.mean(magnetizations)
    E_avg = np.mean(energies)
    M2_avg = np.mean(np.array(magnetizations)**2)
    E2_avg = np.mean(np.array(energies)**2)
    
    # 比热 Cv 根据能量波动计算 (这里单位为每自旋)
    Cv = (E2_avg - E_avg**2) / (T**2)
    # Cm 表示磁化率，根据磁化波动计算（这里简单用 (⟨M²⟩-⟨M⟩²)/T 作为近似）
    Cm = (M2_avg - M_avg**2) / T
    
    return (T, M_avg, E_avg, Cv, Cm)

def plot_and_save_results(results, save_path="monte_carlo_results.png"):
    """
    绘制结果并保存图像
    """
    # 解包结果
    T_vals = [r[0] for r in results]
    M_avg_vals = [r[1] for r in results]
    E_avg_vals = [r[2] for r in results]
    Cv_vals = [r[3] for r in results]
    Cm_vals = [r[4] for r in results]

    # 创建 2x2 子图
    fig, axs = plt.subplots(2, 2, figsize=(12, 10))
    
    # 磁化率 vs 温度
    axs[0, 0].scatter(T_vals, M_avg_vals, c='blue', alpha=0.5)
    axs[0, 0].set_title('Average Magnetization vs Temperature')
    axs[0, 0].set_xlabel('Temperature')
    axs[0, 0].set_ylabel('M_avg')
    axs[0, 0].grid(True)

    # 能量 vs 温度
    axs[0, 1].scatter(T_vals, E_avg_vals, c='red', alpha=0.5)
    axs[0, 1].set_title('Average Energy vs Temperature')
    axs[0, 1].set_xlabel('Temperature')
    axs[0, 1].set_ylabel('E_avg')
    axs[0, 1].grid(True)

    # 比热 vs 温度
    axs[1, 0].scatter(T_vals, Cv_vals, c='green', alpha=0.5)
    axs[1, 0].set_title('Specific Heat vs Temperature')
    axs[1, 0].set_xlabel('Temperature')
    axs[1, 0].set_ylabel('Cv')
    axs[1, 0].grid(True)

    # 磁化率 vs 温度
    axs[1, 1].scatter(T_vals, Cm_vals, c='purple', alpha=0.5)
    axs[1, 1].set_title('Susceptibility vs Temperature')
    axs[1, 1].set_xlabel('Temperature')
    axs[1, 1].set_ylabel('Cm')
    axs[1, 1].grid(True)

    # 调整布局
    plt.tight_layout()
    
    # 保存图像
    plt.savefig(save_path, dpi=300, bbox_inches='tight')
    
    # 显示图像（可选）
    plt.show()

def main():
    
    # 创建输出目录
    os.makedirs('figure_v', exist_ok=True)
    os.makedirs('gif_v', exist_ok=True)
    # 使用多线程并行处理不同温度
    with ThreadPoolExecutor(max_workers=len(temperatures)) as executor:
        executor.map(process_temperature, temperatures)
    
    
    T=np.linspace(1,6,80) #计算统计时的温度
    with ThreadPoolExecutor() as executor:
            results = list(executor.map(MonCa_statistic_calculate, T))
    plot_and_save_results(results)
    # 统计和计算
    

if __name__ == '__main__':
    main()