"""test for image in suitable size"""
from Particle import Particle
from Lattice import HexLattice
import numpy as np
import os
# 参数设置
L = 30  # 晶格大小
temperatures = [0.5, 1.0, 2.0, 3.0, 4.0]  # 不同温度
steps_per_temp = 1000  # 每个温度的蒙特卡洛步数
frames_per_temp = 24  # 每个温度保存的帧数
T=0.5
fig_folder = os.path.join('figure_v', f'T_{T}')
os.makedirs(fig_folder, exist_ok=True)
latticehex = HexLattice(L, 0.5)
[xcondit,ycondit,colors]=latticehex.set_position()

latticehex.generate_image(1,fig_folder,xcondit,ycondit,colors,diameter=60)