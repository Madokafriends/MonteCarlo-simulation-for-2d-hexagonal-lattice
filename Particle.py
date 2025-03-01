class Particle:
    def __init__(self, spin):
        self.spin = spin  # +1 or -1

    def flip(self):
        self.spin *= -1  # flip