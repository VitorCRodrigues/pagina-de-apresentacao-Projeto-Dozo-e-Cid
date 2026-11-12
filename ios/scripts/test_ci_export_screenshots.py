"""Tests for ci-export-screenshots.py: python3 -I -m unittest discover -s ios/scripts -p "test_*.py"."""
import importlib.util
import unittest
from pathlib import Path

_spec = importlib.util.spec_from_file_location(
    "ci_export_screenshots", Path(__file__).with_name("ci-export-screenshots.py"))
exporter = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(exporter)

# The characters actions/upload-artifact refuses in a file name (NTFS limits), plus path separators.
REFUSED = set('":<>|*?\r\n/\\')


class SafeNameTests(unittest.TestCase):
    def test_xctest_debug_description_loses_the_quotes(self):
        # The attachment that broke the upload of run 43302011325.
        name = exporter.safe_name('Debug description for "account.title" Any')
        self.assertEqual(name, "Debug description for _account.title_ Any")

    def test_every_refused_character_is_replaced(self):
        name = exporter.safe_name('a"b:c<d>e|f*g?h\ri\nj/k\\l')
        self.assertFalse(REFUSED & set(name), name)
        self.assertEqual(name, "a_b_c_d_e_f_g_h_i_j_k_l")

    def test_screenshot_names_stay_as_they_are(self):
        self.assertEqual(exporter.safe_name("02-estado-ibkr_pending-OD_iPhone_15"), "02-estado-ibkr_pending-OD_iPhone_15")
        self.assertEqual(exporter.safe_name("Vista previa ñ á"), "Vista previa ñ á")

    def test_an_empty_or_dotted_name_still_gives_a_file_name(self):
        self.assertEqual(exporter.safe_name(""), "attachment")
        self.assertEqual(exporter.safe_name("??"), "__")


class UniquePathTests(unittest.TestCase):
    def test_two_attachments_with_the_same_name_do_not_overwrite_each_other(self):
        taken = set()
        first = exporter.unique_path(Path("out"), "Debug description", ".txt", taken)
        second = exporter.unique_path(Path("out"), "Debug description", ".txt", taken)
        self.assertEqual(first, Path("out/Debug description.txt"))
        self.assertEqual(second, Path("out/Debug description-2.txt"))


if __name__ == "__main__":
    unittest.main()
