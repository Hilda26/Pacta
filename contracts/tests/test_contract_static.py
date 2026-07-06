from pathlib import Path
import ast
import unittest


ROOT = Path(__file__).resolve().parents[1]
CONTRACT = ROOT / "pacta_covenant_registry.py"


class ContractStaticTests(unittest.TestCase):
    def test_contract_has_genlayer_magic_comment(self):
        first_line = CONTRACT.read_text(encoding="utf-8").splitlines()[0]
        self.assertTrue(first_line.startswith('# { "Depends": "py-genlayer:'))

    def test_contract_python_syntax_is_valid(self):
        ast.parse(CONTRACT.read_text(encoding="utf-8"))

    def test_contract_uses_schema_friendly_contract_class(self):
        source = CONTRACT.read_text(encoding="utf-8")
        self.assertIn("class Contract(gl.Contract):", source)
        self.assertNotIn("@allow_storage", source)
        self.assertNotIn("@dataclass", source)
        self.assertNotIn("typing.Any", source)
        self.assertNotIn("DynArray", source)
        self.assertNotIn("__receive__", source)

    def test_contract_exposes_expected_public_methods(self):
        source = CONTRACT.read_text(encoding="utf-8")
        for method_name in [
            "create_covenant",
            "bond_covenant",
            "submit_evidence",
            "request_evaluation",
            "claim_bond",
            "get_covenant",
            "get_bond",
            "get_evidence",
            "get_event",
            "get_event_count",
            "get_reputation",
        ]:
            self.assertIn(f"def {method_name}", source)

    def test_contract_keeps_nondeterminism_in_evaluation_method(self):
        source = CONTRACT.read_text(encoding="utf-8")
        self.assertIn("gl.nondet.web.get", source)
        self.assertIn("gl.nondet.exec_prompt", source)
        self.assertIn("gl.vm.run_nondet_unsafe", source)
        self.assertLess(source.index("def request_evaluation"), source.index("gl.nondet.exec_prompt"))

    def test_validators_independently_cross_check_leader_assessment(self):
        source = CONTRACT.read_text(encoding="utf-8")
        self.assertIn("validator_assessment = leader_fn()", source)
        self.assertIn("def _assessments_agree", source)
        self.assertIn("independent_sources_count", source)
        self.assertIn("source_checks", source)
        self.assertIn("cross_check_summary", source)


if __name__ == "__main__":
    unittest.main()
