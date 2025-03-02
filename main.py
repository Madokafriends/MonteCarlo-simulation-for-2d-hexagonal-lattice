import os
import numpy as np
import imageio
import matplotlib.pyplot as plt
from concurrent.futures import ThreadPoolExecutor
from Lattice import HexLattice
from Particle import Particle

# parameter setting
L = 30  # lattice size
temperatures = [1.0, 2.0, 3.0, 3.5, 4.0, 10.0]  # temperature for visualization
steps_per_temp = 2000  # total MC step
frames_per_temp = 48  # figure number for gif
steps=4000 #Another MC steps only for data analysis 

#k factor always equals to 1 in simulations

def process_temperature(T):
    lattice = HexLattice(L, T)
    for _ in range(steps_per_temp):
        lattice.monte_carlo_step()
    
    # please change the true address here
    fig_folder = os.path.join('figure_v', f'T_{T}')
    os.makedirs(fig_folder, exist_ok=True)
    # save for the figure of the last MC steps, for gif
    
    images = []
    
    for frame in range(frames_per_temp):

            lattice.monte_carlo_step()
            [xcondit,ycondit,colors]=lattice.set_position()
            lattice.generate_image(frame, fig_folder,xcondit,ycondit,colors,diameter=60)
            images.append(os.path.join(fig_folder, f"T_{T}_frame_{frame}.png"))
            
    # generate GIF
    # please change the true address here
    gif_path = os.path.join('gif_v', f'T_{T}.gif')
    with imageio.get_writer(gif_path, mode='I', duration=0.5) as writer:
        for img in images:
            writer.append_data(imageio.imread(img))


def MC_statistic_calculate(T):
    print("calculating temperature T {}".format(T))
    lattice2 = HexLattice(L, T)
    magnetizations = np.zeros(steps) 
    energies = np.zeros(steps)      
    
    
    for i in range(steps):
        
        # averge value divided by（L*L）
        lattice2.monte_carlo_step()
        M = lattice2.calc_total_magnetization() / (L * L)
        E = lattice2.calc_total_energy() / (L * L)
        magnetizations[i]=M
        energies[i]=E
        
    M_avg = np.mean(magnetizations)
    E_avg = np.mean(energies)
    M2_avg = np.mean(np.array(magnetizations)**2)
    E2_avg = np.mean(np.array(energies)**2)
    
    # averge cv approximate method
    Cv = (E2_avg - E_avg**2) / (T**2)
    # (⟨M²⟩-⟨M⟩²)/T as approximate method 
    Cm = (M2_avg - M_avg**2) / T
    
    return (T, M_avg, E_avg, Cv, Cm)

def plot_and_save_results(results, save_path="monte_carlo_results.png"):
    """
    draw the results and save it
    """
    
    T_vals = [r[0] for r in results]
    M_avg_vals = [r[1] for r in results]
    E_avg_vals = [r[2] for r in results]
    Cv_vals = [r[3] for r in results]
    Cm_vals = [r[4] for r in results]


    fig, axs = plt.subplots(2, 2, figsize=(12, 10))
    
    # M vs t
    axs[0, 0].scatter(T_vals, M_avg_vals, c='blue', alpha=0.5)
    axs[0, 0].set_title('Average Magnetization vs Temperature')
    axs[0, 0].set_xlabel('Temperature')
    axs[0, 0].set_ylabel('M_avg')
    axs[0, 0].grid(True)

    # E vs T
    axs[0, 1].scatter(T_vals, E_avg_vals, c='red', alpha=0.5)
    axs[0, 1].set_title('Average Energy vs Temperature')
    axs[0, 1].set_xlabel('Temperature')
    axs[0, 1].set_ylabel('E_avg')
    axs[0, 1].grid(True)

    # Cv vs T
    axs[1, 0].scatter(T_vals, Cv_vals, c='green', alpha=0.5)
    axs[1, 0].set_title('Specific Heat vs Temperature')
    axs[1, 0].set_xlabel('Temperature')
    axs[1, 0].set_ylabel('Cv')
    axs[1, 0].grid(True)

    # Cm vs T
    axs[1, 1].scatter(T_vals, Cm_vals, c='purple', alpha=0.5)
    axs[1, 1].set_title('Susceptibility vs Temperature')
    axs[1, 1].set_xlabel('Temperature')
    axs[1, 1].set_ylabel('Cm')
    axs[1, 1].grid(True)

    
    plt.tight_layout()
    
    # save the picture
    plt.savefig(save_path, dpi=300, bbox_inches='tight')
    
    plt.show()

def main():
    
    # make output dir, please change the true address here
    os.makedirs('figure_v', exist_ok=True)
    os.makedirs('gif_v', exist_ok=True)
    # use thread pool to accelerate the results
    with ThreadPoolExecutor(max_workers=len(temperatures)) as executor:
        executor.map(process_temperature, temperatures)
    
    
    T_array=np.linspace(1,6,80) #MC for different T, statistic analysis
    with ThreadPoolExecutor() as executor:
            results = list(executor.map(MC_statistic_calculate, T_array))
    plot_and_save_results(results)
   
    

if __name__ == '__main__':
    main()