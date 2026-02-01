import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Generator
from unittest import mock

import faiss
import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).parent.parent / "repository_after"))

from build_index import (
    DEFAULT_MODEL,
    MODEL_ENV_VAR,
    build_faiss_index,
    generate_embeddings,
    load_jsonl,
    main,
    parse_args,
    save_outputs,
)


@pytest.fixture
def fixtures_dir() -> Path:
    return Path(__file__).parent / "fixtures"


@pytest.fixture
def valid_input_path(fixtures_dir: Path) -> Path:
    return fixtures_dir / "valid_input.jsonl"


@pytest.fixture
def single_record_path(fixtures_dir: Path) -> Path:
    return fixtures_dir / "single_record.jsonl"


@pytest.fixture
def temp_output_dir() -> Generator[Path, None, None]:
    temp_dir = Path(tempfile.mkdtemp())
    yield temp_dir
    shutil.rmtree(temp_dir, ignore_errors=True)


@pytest.fixture
def mock_model():
    model = mock.MagicMock()
    model.encode.return_value = np.random.randn(5, 384).astype(np.float32)
    return model


class TestRequirement1_JSONLInput:
    
    def test_load_valid_jsonl_file(self, valid_input_path: Path):
        records = load_jsonl(str(valid_input_path))
        
        assert len(records) == 5
        assert all("text" in record for record in records)
        assert all(isinstance(record["text"], str) for record in records)
    
    def test_load_jsonl_preserves_metadata(self, valid_input_path: Path):
        records = load_jsonl(str(valid_input_path))
        
        assert records[0]["source"] == "docs/python.md"
        assert records[0]["chunk_id"] == 1
    
    def test_load_single_record(self, single_record_path: Path):
        records = load_jsonl(str(single_record_path))
        
        assert len(records) == 1
        assert records[0]["text"] == "A single document for testing minimal input."
        assert records[0]["category"] == "test"
    
    def test_missing_text_field_raises_error(self, fixtures_dir: Path):
        path = fixtures_dir / "missing_text_field.jsonl"
        
        with pytest.raises(ValueError, match="Missing required 'text' field"):
            load_jsonl(str(path))
    
    def test_empty_text_field_raises_error(self, fixtures_dir: Path):
        path = fixtures_dir / "empty_text_field.jsonl"
        
        with pytest.raises(ValueError, match="Field 'text' cannot be empty"):
            load_jsonl(str(path))
    
    def test_non_string_text_field_raises_error(self, fixtures_dir: Path):
        path = fixtures_dir / "non_string_text.jsonl"
        
        with pytest.raises(ValueError, match="Field 'text' must be a string"):
            load_jsonl(str(path))
    
    def test_invalid_json_raises_error(self, fixtures_dir: Path):
        path = fixtures_dir / "invalid_json.jsonl"
        
        with pytest.raises(ValueError, match="Invalid JSON on line"):
            load_jsonl(str(path))
    
    def test_empty_file_raises_error(self, fixtures_dir: Path):
        path = fixtures_dir / "empty_file.jsonl"
        
        with pytest.raises(ValueError, match="Input file contains no valid records"):
            load_jsonl(str(path))
    
    def test_file_not_found_raises_error(self):
        with pytest.raises(FileNotFoundError, match="Input file not found"):
            load_jsonl("/nonexistent/path/file.jsonl")
    
    def test_skips_empty_lines(self, temp_output_dir: Path):
        input_path = temp_output_dir / "with_empty_lines.jsonl"
        
        with open(input_path, "w") as f:
            f.write('{"text": "First line"}\n')
            f.write('\n')
            f.write('{"text": "Second line"}\n')
            f.write('   \n')
            f.write('{"text": "Third line"}\n')
        
        records = load_jsonl(str(input_path))
        
        assert len(records) == 3


class TestRequirement2_GenerateEmbeddings:
    
    def test_generate_embeddings_returns_correct_shape(self, mock_model):
        texts = ["Text 1", "Text 2", "Text 3", "Text 4", "Text 5"]
        
        embeddings = generate_embeddings(texts, mock_model)
        
        assert embeddings.shape == (5, 384)
    
    def test_generate_embeddings_calls_model_encode(self, mock_model):
        texts = ["Sample text"]
        mock_model.encode.return_value = np.random.randn(1, 384).astype(np.float32)
        
        generate_embeddings(texts, mock_model)
        
        mock_model.encode.assert_called_once()
        call_args = mock_model.encode.call_args
        assert call_args[0][0] == texts
        assert call_args[1]["show_progress_bar"] is True
        assert call_args[1]["convert_to_numpy"] is True
    
    def test_generate_embeddings_validates_shape_mismatch(self, mock_model):
        texts = ["Only one text"]
        mock_model.encode.return_value = np.random.randn(5, 384).astype(np.float32)
        
        with pytest.raises(ValueError, match="Embedding count mismatch"):
            generate_embeddings(texts, mock_model)
    
    def test_generate_embeddings_validates_dimensions(self, mock_model):
        texts = ["Sample text"]
        mock_model.encode.return_value = np.random.randn(384).astype(np.float32)
        
        with pytest.raises(ValueError, match="Expected 2D embedding array"):
            generate_embeddings(texts, mock_model)


class TestRequirement3_NormalizeEmbeddings:
    
    def test_embeddings_are_normalized(self, mock_model):
        texts = ["Sample text 1", "Sample text 2", "Sample text 3"]
        mock_model.encode.return_value = np.array([
            [1.0, 2.0, 3.0],
            [4.0, 5.0, 6.0],
            [7.0, 8.0, 9.0]
        ], dtype=np.float32)
        
        embeddings = generate_embeddings(texts, mock_model)
        
        norms = np.linalg.norm(embeddings, axis=1)
        np.testing.assert_array_almost_equal(norms, np.ones(3), decimal=5)
    
    def test_normalized_vectors_enable_cosine_similarity_via_dot_product(self, mock_model):
        texts = ["Text A", "Text B"]
        
        v1 = np.array([1.0, 0.0, 0.0])
        v2 = np.array([1.0, 1.0, 0.0])
        mock_model.encode.return_value = np.array([v1, v2], dtype=np.float32)
        
        embeddings = generate_embeddings(texts, mock_model)
        
        dot_product = np.dot(embeddings[0], embeddings[1])
        
        v1_norm = v1 / np.linalg.norm(v1)
        v2_norm = v2 / np.linalg.norm(v2)
        expected_cosine = np.dot(v1_norm, v2_norm)
        
        np.testing.assert_almost_equal(dot_product, expected_cosine, decimal=5)


class TestRequirement4_BuildFAISSIndex:
    
    def test_build_index_creates_index_flat_ip(self):
        embeddings = np.random.randn(10, 384).astype(np.float32)
        faiss.normalize_L2(embeddings)
        
        index = build_faiss_index(embeddings)
        
        assert isinstance(index, faiss.IndexFlatIP)
    
    def test_index_contains_correct_number_of_vectors(self):
        num_vectors = 25
        embeddings = np.random.randn(num_vectors, 384).astype(np.float32)
        faiss.normalize_L2(embeddings)
        
        index = build_faiss_index(embeddings)
        
        assert index.ntotal == num_vectors
    
    def test_index_has_correct_dimension(self):
        dim = 384
        embeddings = np.random.randn(10, dim).astype(np.float32)
        faiss.normalize_L2(embeddings)
        
        index = build_faiss_index(embeddings)
        
        assert index.d == dim
    
    def test_index_supports_similarity_search(self):
        embeddings = np.random.randn(10, 384).astype(np.float32)
        faiss.normalize_L2(embeddings)
        
        index = build_faiss_index(embeddings)
        
        query = embeddings[0:1]
        distances, indices = index.search(query, k=1)
        
        assert indices[0][0] == 0
        np.testing.assert_almost_equal(distances[0][0], 1.0, decimal=5)


class TestRequirement5_PersistFAISSIndex:
    
    def test_save_creates_index_file(self, temp_output_dir: Path):
        embeddings = np.random.randn(10, 384).astype(np.float32)
        faiss.normalize_L2(embeddings)
        index = build_faiss_index(embeddings)
        records = [{"text": f"Text {i}"} for i in range(10)]
        
        index_path = str(temp_output_dir / "test.index")
        metadata_path = str(temp_output_dir / "test_metadata.jsonl")
        
        save_outputs(index, records, index_path, metadata_path)
        
        assert Path(index_path).exists()
    
    def test_saved_index_is_loadable(self, temp_output_dir: Path):
        embeddings = np.random.randn(10, 384).astype(np.float32)
        faiss.normalize_L2(embeddings)
        index = build_faiss_index(embeddings)
        records = [{"text": f"Text {i}"} for i in range(10)]
        
        index_path = str(temp_output_dir / "test.index")
        metadata_path = str(temp_output_dir / "test_metadata.jsonl")
        
        save_outputs(index, records, index_path, metadata_path)
        
        loaded_index = faiss.read_index(index_path)
        
        assert loaded_index.ntotal == 10
        assert loaded_index.d == 384
    
    def test_saved_index_preserves_search_capability(self, temp_output_dir: Path):
        embeddings = np.random.randn(10, 384).astype(np.float32)
        faiss.normalize_L2(embeddings)
        index = build_faiss_index(embeddings)
        records = [{"text": f"Text {i}"} for i in range(10)]
        
        index_path = str(temp_output_dir / "test.index")
        metadata_path = str(temp_output_dir / "test_metadata.jsonl")
        
        save_outputs(index, records, index_path, metadata_path)
        
        loaded_index = faiss.read_index(index_path)
        query = embeddings[5:6]
        distances, indices = loaded_index.search(query, k=1)
        
        assert indices[0][0] == 5


class TestRequirement6_StoreMetadata:
    
    def test_save_creates_metadata_file(self, temp_output_dir: Path):
        embeddings = np.random.randn(5, 384).astype(np.float32)
        faiss.normalize_L2(embeddings)
        index = build_faiss_index(embeddings)
        records = [{"text": f"Text {i}", "id": i} for i in range(5)]
        
        index_path = str(temp_output_dir / "test.index")
        metadata_path = str(temp_output_dir / "test_metadata.jsonl")
        
        save_outputs(index, records, index_path, metadata_path)
        
        assert Path(metadata_path).exists()
    
    def test_metadata_preserves_all_records(self, temp_output_dir: Path):
        embeddings = np.random.randn(5, 384).astype(np.float32)
        faiss.normalize_L2(embeddings)
        index = build_faiss_index(embeddings)
        records = [
            {"text": "Text 1", "id": 1, "source": "doc1.md"},
            {"text": "Text 2", "id": 2, "source": "doc2.md"},
            {"text": "Text 3", "id": 3, "source": "doc3.md"},
            {"text": "Text 4", "id": 4, "source": "doc4.md"},
            {"text": "Text 5", "id": 5, "source": "doc5.md"},
        ]
        
        index_path = str(temp_output_dir / "test.index")
        metadata_path = str(temp_output_dir / "test_metadata.jsonl")
        
        save_outputs(index, records, index_path, metadata_path)
        
        loaded_records = []
        with open(metadata_path, "r") as f:
            for line in f:
                loaded_records.append(json.loads(line))
        
        assert len(loaded_records) == 5
        assert loaded_records == records
    
    def test_metadata_preserves_field_order(self, temp_output_dir: Path):
        embeddings = np.random.randn(1, 384).astype(np.float32)
        faiss.normalize_L2(embeddings)
        index = build_faiss_index(embeddings)
        records = [{
            "text": "Sample text",
            "id": 42,
            "source": "test.md",
            "chunk_id": 7,
            "custom_field": "custom_value"
        }]
        
        index_path = str(temp_output_dir / "test.index")
        metadata_path = str(temp_output_dir / "test_metadata.jsonl")
        
        save_outputs(index, records, index_path, metadata_path)
        
        with open(metadata_path, "r") as f:
            loaded = json.loads(f.readline())
        
        assert loaded["text"] == "Sample text"
        assert loaded["id"] == 42
        assert loaded["source"] == "test.md"
        assert loaded["chunk_id"] == 7
        assert loaded["custom_field"] == "custom_value"
    
    def test_metadata_index_mapping(self, temp_output_dir: Path):
        embeddings = np.random.randn(10, 384).astype(np.float32)
        faiss.normalize_L2(embeddings)
        index = build_faiss_index(embeddings)
        records = [{"text": f"Document {i}", "doc_id": i} for i in range(10)]
        
        index_path = str(temp_output_dir / "test.index")
        metadata_path = str(temp_output_dir / "test_metadata.jsonl")
        
        save_outputs(index, records, index_path, metadata_path)
        
        loaded_records = []
        with open(metadata_path, "r") as f:
            for line in f:
                loaded_records.append(json.loads(line))
        
        loaded_index = faiss.read_index(index_path)
        query = embeddings[5:6]
        _, indices = loaded_index.search(query, k=1)
        
        result_idx = indices[0][0]
        assert loaded_records[result_idx]["doc_id"] == 5


class TestRequirement7_ModelConfiguration:
    
    def test_default_model_is_set(self):
        assert DEFAULT_MODEL == "sentence-transformers/all-MiniLM-L6-v2"
    
    def test_model_env_var_name_is_correct(self):
        assert MODEL_ENV_VAR == "EMBEDDING_MODEL"
    
    def test_parse_args_uses_default_model(self):
        with mock.patch.dict(os.environ, {}, clear=True):
            os.environ.pop(MODEL_ENV_VAR, None)
            
            with mock.patch("sys.argv", ["build_index.py", 
                                         "--input", "in.jsonl",
                                         "--index", "out.index",
                                         "--metadata", "meta.jsonl"]):
                args = parse_args()
                
                assert args.model == DEFAULT_MODEL
    
    def test_parse_args_accepts_custom_model_via_cli(self):
        custom_model = "sentence-transformers/all-mpnet-base-v2"
        
        with mock.patch("sys.argv", ["build_index.py",
                                     "--input", "in.jsonl",
                                     "--index", "out.index",
                                     "--metadata", "meta.jsonl",
                                     "--model", custom_model]):
            args = parse_args()
            
            assert args.model == custom_model
    
    def test_parse_args_reads_model_from_env_var(self):
        custom_model = "sentence-transformers/paraphrase-MiniLM-L6-v2"
        
        with mock.patch.dict(os.environ, {MODEL_ENV_VAR: custom_model}):
            with mock.patch("sys.argv", ["build_index.py",
                                         "--input", "in.jsonl",
                                         "--index", "out.index",
                                         "--metadata", "meta.jsonl"]):
                args = parse_args()
                
                assert args.model == custom_model
    
    def test_cli_argument_overrides_env_var(self):
        env_model = "sentence-transformers/from-env"
        cli_model = "sentence-transformers/from-cli"
        
        with mock.patch.dict(os.environ, {MODEL_ENV_VAR: env_model}):
            with mock.patch("sys.argv", ["build_index.py",
                                         "--input", "in.jsonl",
                                         "--index", "out.index",
                                         "--metadata", "meta.jsonl",
                                         "--model", cli_model]):
                args = parse_args()
                
                assert args.model == cli_model
    
    def test_parse_args_required_arguments(self):
        with mock.patch("sys.argv", ["build_index.py"]):
            with pytest.raises(SystemExit):
                parse_args()
    
    def test_parse_args_short_flags(self):
        with mock.patch("sys.argv", ["build_index.py",
                                     "-i", "input.jsonl",
                                     "-o", "output.index",
                                     "-m", "metadata.jsonl"]):
            args = parse_args()
            
            assert args.input == "input.jsonl"
            assert args.index == "output.index"
            assert args.metadata == "metadata.jsonl"


class TestRequirement8_CreateOutputDirectories:
    
    def test_creates_index_directory(self, temp_output_dir: Path):
        embeddings = np.random.randn(5, 384).astype(np.float32)
        faiss.normalize_L2(embeddings)
        index = build_faiss_index(embeddings)
        records = [{"text": f"Text {i}"} for i in range(5)]
        
        nested_dir = temp_output_dir / "level1" / "level2" / "level3"
        index_path = str(nested_dir / "test.index")
        metadata_path = str(temp_output_dir / "metadata.jsonl")
        
        save_outputs(index, records, index_path, metadata_path)
        
        assert nested_dir.exists()
        assert Path(index_path).exists()
    
    def test_creates_metadata_directory(self, temp_output_dir: Path):
        embeddings = np.random.randn(5, 384).astype(np.float32)
        faiss.normalize_L2(embeddings)
        index = build_faiss_index(embeddings)
        records = [{"text": f"Text {i}"} for i in range(5)]
        
        nested_dir = temp_output_dir / "meta" / "nested" / "dir"
        index_path = str(temp_output_dir / "test.index")
        metadata_path = str(nested_dir / "metadata.jsonl")
        
        save_outputs(index, records, index_path, metadata_path)
        
        assert nested_dir.exists()
        assert Path(metadata_path).exists()
    
    def test_creates_both_directories_independently(self, temp_output_dir: Path):
        embeddings = np.random.randn(5, 384).astype(np.float32)
        faiss.normalize_L2(embeddings)
        index = build_faiss_index(embeddings)
        records = [{"text": f"Text {i}"} for i in range(5)]
        
        index_dir = temp_output_dir / "indexes" / "faiss"
        metadata_dir = temp_output_dir / "metadata" / "jsonl"
        index_path = str(index_dir / "test.index")
        metadata_path = str(metadata_dir / "metadata.jsonl")
        
        save_outputs(index, records, index_path, metadata_path)
        
        assert index_dir.exists()
        assert metadata_dir.exists()
    
    def test_handles_existing_directories(self, temp_output_dir: Path):
        embeddings = np.random.randn(5, 384).astype(np.float32)
        faiss.normalize_L2(embeddings)
        index = build_faiss_index(embeddings)
        records = [{"text": f"Text {i}"} for i in range(5)]
        
        index_path = str(temp_output_dir / "test.index")
        metadata_path = str(temp_output_dir / "metadata.jsonl")
        
        save_outputs(index, records, index_path, metadata_path)
        
        assert Path(index_path).exists()
        assert Path(metadata_path).exists()


class TestIntegration:
    
    def test_main_function_success(self, valid_input_path: Path, temp_output_dir: Path):
        index_path = str(temp_output_dir / "output" / "test.index")
        metadata_path = str(temp_output_dir / "output" / "metadata.jsonl")
        
        with mock.patch("sys.argv", ["build_index.py",
                                     "--input", str(valid_input_path),
                                     "--index", index_path,
                                     "--metadata", metadata_path]):
            exit_code = main()
        
        assert exit_code == 0
        assert Path(index_path).exists()
        assert Path(metadata_path).exists()
    
    def test_main_function_file_not_found(self, temp_output_dir: Path):
        with mock.patch("sys.argv", ["build_index.py",
                                     "--input", "/nonexistent/file.jsonl",
                                     "--index", str(temp_output_dir / "test.index"),
                                     "--metadata", str(temp_output_dir / "meta.jsonl")]):
            exit_code = main()
        
        assert exit_code == 1
    
    def test_main_function_validation_error(self, fixtures_dir: Path, temp_output_dir: Path):
        with mock.patch("sys.argv", ["build_index.py",
                                     "--input", str(fixtures_dir / "missing_text_field.jsonl"),
                                     "--index", str(temp_output_dir / "test.index"),
                                     "--metadata", str(temp_output_dir / "meta.jsonl")]):
            exit_code = main()
        
        assert exit_code == 1
    
    def test_complete_workflow_produces_searchable_index(
        self, 
        valid_input_path: Path, 
        temp_output_dir: Path
    ):
        index_path = str(temp_output_dir / "search.index")
        metadata_path = str(temp_output_dir / "search_metadata.jsonl")
        
        with mock.patch("sys.argv", ["build_index.py",
                                     "--input", str(valid_input_path),
                                     "--index", index_path,
                                     "--metadata", metadata_path]):
            exit_code = main()
        
        assert exit_code == 0
        
        loaded_index = faiss.read_index(index_path)
        assert loaded_index.ntotal == 5
        
        with open(metadata_path, "r") as f:
            metadata_records = [json.loads(line) for line in f]
        assert len(metadata_records) == 5
        
        from sentence_transformers import SentenceTransformer
        model = SentenceTransformer(DEFAULT_MODEL)
        
        query = model.encode(["FAISS vector search"], convert_to_numpy=True)
        faiss.normalize_L2(query)
        
        distances, indices = loaded_index.search(query, k=1)
        result_record = metadata_records[indices[0][0]]
        
        assert "text" in result_record
    
    def test_cli_help_displays_correctly(self):
        result = subprocess.run(
            [sys.executable, 
             str(Path(__file__).parent.parent / "repository_after" / "build_index.py"),
             "--help"],
            capture_output=True,
            text=True
        )
        
        assert result.returncode == 0
        assert "--input" in result.stdout
        assert "--index" in result.stdout
        assert "--metadata" in result.stdout
        assert "--model" in result.stdout


class TestConsoleOutput:
    
    def test_main_prints_record_count(self, valid_input_path: Path, temp_output_dir: Path, capsys):
        index_path = str(temp_output_dir / "test.index")
        metadata_path = str(temp_output_dir / "meta.jsonl")
        
        with mock.patch("sys.argv", ["build_index.py",
                                     "--input", str(valid_input_path),
                                     "--index", index_path,
                                     "--metadata", metadata_path]):
            main()
        
        captured = capsys.readouterr()
        assert "5" in captured.out
        assert "records" in captured.out.lower() or "Records" in captured.out
    
    def test_main_prints_embedding_dim(self, valid_input_path: Path, temp_output_dir: Path, capsys):
        index_path = str(temp_output_dir / "test.index")
        metadata_path = str(temp_output_dir / "meta.jsonl")
        
        with mock.patch("sys.argv", ["build_index.py",
                                     "--input", str(valid_input_path),
                                     "--index", index_path,
                                     "--metadata", metadata_path]):
            main()
        
        captured = capsys.readouterr()
        assert "384" in captured.out
    
    def test_main_prints_model_name(self, valid_input_path: Path, temp_output_dir: Path, capsys):
        index_path = str(temp_output_dir / "test.index")
        metadata_path = str(temp_output_dir / "meta.jsonl")
        
        with mock.patch("sys.argv", ["build_index.py",
                                     "--input", str(valid_input_path),
                                     "--index", index_path,
                                     "--metadata", metadata_path]):
            main()
        
        captured = capsys.readouterr()
        assert DEFAULT_MODEL in captured.out or "MiniLM" in captured.out
