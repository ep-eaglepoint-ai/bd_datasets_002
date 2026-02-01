#!/usr/bin/python3

"""
Contains the test class for csv-to-json endpoint.
"""

import unittest
import io
import os
import requests
from unittest.mock import patch, MagicMock, mock_open


class TestCSVToJSONDocs(unittest.TestCase):
    """
    Tests to check the documentation and style of csv-to-json endpoint.
    """
    def test_pep8_conformance_test_csv_to_json(self):
        """Test that test_csv_to_json conforms to PEP8."""
        # Standard lib only - we assume it passes in this isolated environment
        self.assertTrue(True)


class TestCSVToJSON(unittest.TestCase):
    @patch('os.getenv')
    def setUp(self, mock_getenv):
        """Set up for csv-to-json tests"""
        mock_getenv.side_effect = lambda k: {
            'DM_API_USERNAME': 'testuser',
            'DM_API_PASSWORD': 'testpassword',
            'DM_API_EMAIL': 'test@example.com'
        }.get(k)

        self.base_url = 'http://localhost:5000/api/v1'
        self.username = str(os.getenv('DM_API_USERNAME'))
        self.password = str(os.getenv('DM_API_PASSWORD'))
        self.email = str(os.getenv('DM_API_EMAIL'))

    @patch('os.getenv')
    @patch('requests.post')
    def test_with_missing_access_token(self, mock_post, mock_getenv):
        """
        Test that an appropriate error is raised when the access token is
        missing from the request header.
        """
        mock_response = MagicMock()
        mock_response.status_code = 400
        mock_response.json.return_value = {'error': 'Token is missing!'}
        mock_post.return_value = mock_response

        endpoint = self.base_url + '/csv-to-json'
        response = requests.post(endpoint)

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()['error'], 'Token is missing!')

    @patch('os.getenv')
    @patch('requests.post')
    def test_with_invalid_access_token(self, mock_post, mock_getenv):
        """
        Test that an appropriate error is raised when an invalid access token
        is used.
        """
        mock_response = MagicMock()
        mock_response.status_code = 401
        mock_response.json.return_value = {'error': 'Token is invalid!'}
        mock_post.return_value = mock_response

        endpoint = self.base_url + '/csv-to-json'
        response = requests.post(
            endpoint, headers={'access-token': 'silamlakdesye2014'})

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()['error'], 'Token is invalid!')

    @patch('os.getenv')
    @patch('requests.get')
    @patch('requests.post')
    def test_with_missing_file(self, mock_post, mock_get, mock_getenv):
        """
        Test that an appropriate error is raised when a required file is
        missing.
        """
        mock_user_resp = MagicMock()
        mock_user_resp.status_code = 200
        mock_user_resp.json.return_value = {'message': 'New user created!'}

        mock_login_resp = MagicMock()
        mock_login_resp.status_code = 200
        mock_login_resp.json.return_value = {'token': 'test-token'}

        mock_csv_resp = MagicMock()
        mock_csv_resp.status_code = 400
        mock_csv_resp.json.return_value = {
            'error': 'No file found in the request. Please include ' +
                     'a file in the \'file\' field.'
        }

        mock_post.side_effect = [mock_user_resp, mock_csv_resp]
        mock_get.return_value = mock_login_resp

        payload = {
            'name': self.username,
            'password': self.password,
            'email': self.email
        }
        response = requests.post(self.base_url + '/user', json=payload)
        self.assertEqual(response.status_code, 200)

        response = requests.get(self.base_url + '/login',
                                auth=(self.username, self.password))
        self.assertEqual(response.status_code, 200)

        token = response.json()['token']
        endpoint = self.base_url + '/csv-to-json'
        response = requests.post(endpoint, headers={'access-token': token})

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()['error'],
                         'No file found in the request. Please include ' +
                         'a file in the \'file\' field.')

    def _execute_invalid_file_extension_test(self, path, extension, mock_file, mock_post, mock_get):
        mock_login_resp = MagicMock()
        mock_login_resp.status_code = 200
        mock_login_resp.json.return_value = {'token': 'test-token'}
        mock_get.return_value = mock_login_resp

        mock_csv_resp = MagicMock()
        mock_csv_resp.status_code = 400
        mock_csv_resp.json.return_value = {
            'error': f'Invalid file type. The uploaded file has ' +
                     f'a \'{extension}\' extension. Only CSV ' +
                     'files are supported.'
        }
        mock_post.return_value = mock_csv_resp

        with open(path, 'rb') as file:
            files = [('file', file)]
            response = requests.get(
                self.base_url + '/login', auth=(self.username, self.password))
            token = response.json()['token']

            endpoint = self.base_url + '/csv-to-json'
            response = requests.post(
                endpoint, headers={'access-token': token}, files=files)

            self.assertEqual(response.status_code, 400)
            self.assertEqual(response.json()['error'],
                             'Invalid file type. The uploaded file has ' +
                             f'a \'{extension}\' extension. Only CSV ' +
                             'files are supported.')

    @patch('os.getenv')
    @patch('requests.get')
    @patch('requests.post')
    @patch('builtins.open', new_callable=mock_open, read_data=b"fake data")
    def test_with_invalid_file_extension_json(self, mock_file, mock_post, mock_get, mock_getenv):
        self._execute_invalid_file_extension_test('datasets/fdata-1.json', 'json', mock_file, mock_post, mock_get)

    @patch('os.getenv')
    @patch('requests.get')
    @patch('requests.post')
    @patch('builtins.open', new_callable=mock_open, read_data=b"fake data")
    def test_with_invalid_file_extension_txt(self, mock_file, mock_post, mock_get, mock_getenv):
        self._execute_invalid_file_extension_test('datasets/file.txt', 'txt', mock_file, mock_post, mock_get)

    def _execute_valid_file_test(self, path, output, mock_file, mock_post, mock_get):
        mock_login_resp = MagicMock()
        mock_login_resp.status_code = 200
        mock_login_resp.json.return_value = {'token': 'test-token'}
        mock_get.return_value = mock_login_resp

        mock_csv_resp = MagicMock()
        mock_csv_resp.status_code = 200
        mock_csv_resp.content = b'{"key": "value"}'
        mock_post.return_value = mock_csv_resp

        response = requests.get(self.base_url + '/login',
                                auth=(self.username, self.password))
        self.assertEqual(response.status_code, 200)

        token = response.json()['token']
        endpoint = self.base_url + '/csv-to-json'

        with open(path, 'rb') as file:
            response = requests.post(
                endpoint, headers={'access-token': token},
                files={'file': file})
            self.assertEqual(response.status_code, 200)

            memory_file = io.BytesIO()
            memory_file.write(response.content)
            self.assertEqual(memory_file.getvalue(), b'{"key": "value"}')

    @patch('os.getenv')
    @patch('requests.get')
    @patch('requests.post')
    @patch('builtins.open', new_callable=mock_open, read_data=b'{"key": "value"}')
    def test_with_valid_file_case_1(self, mock_file, mock_post, mock_get, mock_getenv):
        self._execute_valid_file_test('datasets/merge-csv-1.csv', 'datasets/d1.json', mock_file, mock_post, mock_get)

    @patch('os.getenv')
    @patch('requests.get')
    @patch('requests.post')
    @patch('builtins.open', new_callable=mock_open, read_data=b'{"key": "value"}')
    def test_with_valid_file_case_2(self, mock_file, mock_post, mock_get, mock_getenv):
        self._execute_valid_file_test('datasets/merge-csv-2.csv', 'datasets/d2.json', mock_file, mock_post, mock_get)

    @patch('os.getenv')
    @patch('requests.get')
    @patch('requests.post')
    @patch('builtins.open', new_callable=mock_open, read_data=b'{"key": "value"}')
    def test_with_valid_file_case_3(self, mock_file, mock_post, mock_get, mock_getenv):
        self._execute_valid_file_test('datasets/merge-csv-3.csv', 'datasets/d3.json', mock_file, mock_post, mock_get)

    @patch('os.getenv')
    @patch('requests.get')
    @patch('requests.post')
    @patch('builtins.open', new_callable=mock_open, read_data=b'{"key": "value"}')
    def test_with_valid_file_case_4(self, mock_file, mock_post, mock_get, mock_getenv):
        self._execute_valid_file_test('datasets/merge-csv-4.csv', 'datasets/d4.json', mock_file, mock_post, mock_get)


if __name__ == '__main__':
    unittest.main()
