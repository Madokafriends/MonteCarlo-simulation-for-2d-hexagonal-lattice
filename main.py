import os
import numpy as np
import imageio
from concurrent.futures import ThreadPoolExecutor
from Lattice import HexLattice
from Particle import Particle

# 参数设置
L = 30  # 晶格大小
temperatures = [0.5, 1.0, 2.0, 3.0, 4.0, 10.0]  # 不同温度
steps_per_temp = 2000  # 每个温度的蒙特卡洛步数
frames_per_temp = 48  # 每个温度保存的帧数

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
    magnetizations = []  # 存放每帧的磁化
    energies = []        # 存放每帧的能量
    
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

def main():
    # 创建输出目录
    os.makedirs('figure_v', exist_ok=True)
    os.makedirs('gif_v', exist_ok=True)
    # 使用多线程并行处理不同温度
    with ThreadPoolExecutor(max_workers=len(temperatures)) as executor:
        executor.map(process_temperature, temperatures)

if __name__ == '__main__':
    main()