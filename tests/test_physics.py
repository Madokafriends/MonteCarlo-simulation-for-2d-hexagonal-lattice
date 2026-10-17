import math
import unittest
from Lattice import HexLattice
from main import thermodynamics


class PhysicsTests(unittest.TestCase):
    def test_six_distinct_reciprocal_neighbors(self):
        for size in (4,6,10):
            m=HexLattice(size,2,1)
            for i in range(size):
                for j in range(size):
                    ns=m.get_neighbors(i,j)
                    self.assertEqual(len(set(ns)),6)
                    for q in ns: self.assertIn((i,j),m.get_neighbors(*q))

    def test_interior_neighbors_have_unit_distance(self):
        m=HexLattice(8,2,1);x,y,_=m.set_position()
        for i in range(1,7):
            for j in range(1,7):
                for r,c in m.get_neighbors(i,j):
                    self.assertAlmostEqual(math.hypot(x[i*8+j]-x[r*8+c],y[i*8+j]-y[r*8+c]),1)

    def test_every_energy_delta_matches_full_recalculation(self):
        m=HexLattice(6,2,7)
        for i in range(6):
            for j in range(6):
                e=m.calc_total_energy();d=m.delta_energy(i,j)
                m.lattice[i,j].flip()
                self.assertEqual(m.calc_total_energy()-e,d)
                m.lattice[i,j].flip()
        for p in m.lattice.flat:p.spin=1
        self.assertEqual(m.calc_total_energy(),-3*36)
        self.assertEqual(m.calc_total_magnetization(),36)

    def test_zero_temperature_and_reproducibility(self):
        m=HexLattice(4,0,1)
        for p in m.lattice.flat:p.spin=1
        self.assertFalse(m.attempt_flip(1,1,0)['accepted'])
        m.lattice[1,1].flip()
        self.assertTrue(m.attempt_flip(1,1,.99)['accepted'])
        a,b=HexLattice(6,3.1,42),HexLattice(6,3.1,42)
        for _ in range(3):a.monte_carlo_step();b.monte_carlo_step()
        self.assertEqual([p.spin for p in a.lattice.flat],[p.spin for p in b.lattice.flat])

    def test_extensive_fluctuation_normalization(self):
        s=thermodynamics([-12,-4],[-4,4],4,2)
        self.assertEqual(s['energy_per_spin'],-2)
        self.assertEqual(s['specific_heat'],1)
        self.assertEqual(s['susceptibility'],2)
        self.assertEqual(s['abs_magnetization'],1)

    def test_invalid_geometry(self):
        for size in (0,3,5):
            with self.assertRaises(ValueError):HexLattice(size,2)


if __name__=='__main__':unittest.main()
