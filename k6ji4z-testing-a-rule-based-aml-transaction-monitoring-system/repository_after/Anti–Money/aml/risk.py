class Risk:
    # Toy list for demo. Replace with your own risk tables.
    HIGH_RISK_COUNTRIES = {"IR", "KP", "SY", "MM", "AF", "SD", "SS", "VE"}

    @staticmethod
    def country_risk(country_code: str) -> float:
        return 1.0 if country_code.upper() in Risk.HIGH_RISK_COUNTRIES else 0.2

    @staticmethod
    def pep_risk(is_pep: bool) -> float:
        return 0.9 if is_pep else 0.1
