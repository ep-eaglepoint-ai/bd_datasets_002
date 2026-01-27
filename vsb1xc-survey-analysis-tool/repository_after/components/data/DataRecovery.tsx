'use client';

import React, { useState, useEffect } from 'react';
import {
  checkDatabaseIntegrity,
  recoverInterruptedWrites,
  createBackup,
  restoreBackup,
} from '@/lib/storage/recovery';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export const DataRecovery: React.FC = () => {
  const [integrity, setIntegrity] = useState<{
    valid: boolean;
    errors: string[];
    recovered: boolean;
  } | null>(null);
  const [recovery, setRecovery] = useState<{
    recovered: number;
    errors: string[];
  } | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    checkIntegrity();
  }, []);

  const checkIntegrity = async () => {
    setChecking(true);
    try {
      const result = await checkDatabaseIntegrity();
      setIntegrity(result);
    } catch (error) {
      setIntegrity({
        valid: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        recovered: false,
      });
    } finally {
      setChecking(false);
    }
  };

  const handleRecover = async () => {
    setChecking(true);
    try {
      const result = await recoverInterruptedWrites();
      setRecovery(result);
      await checkIntegrity(); // Re-check after recovery
    } catch (error) {
      alert(`Recovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setChecking(false);
    }
  };

  const handleBackup = async () => {
    try {
      const backup = await createBackup();
      const url = URL.createObjectURL(backup);
      const link = document.createElement('a');
      link.href = url;
      link.download = `survey-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      alert('Backup created successfully');
    } catch (error) {
      alert(`Backup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleRestore = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!confirm('Restore from backup? This will replace all current data.')) {
      return;
    }

    try {
      await restoreBackup(file);
      alert('Backup restored successfully');
      await checkIntegrity();
    } catch (error) {
      alert(`Restore failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <Card title="Data Recovery & Backup" description="Database integrity checks and backup/restore">
      <div className="space-y-4">
        <div>
          <Button
            variant="primary"
            onClick={checkIntegrity}
            isLoading={checking}
          >
            Check Database Integrity
          </Button>
        </div>

        {integrity && (
          <div className={`p-4 rounded ${
            integrity.valid ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'
          }`}>
            <p className={`font-medium ${
              integrity.valid ? 'text-green-800' : 'text-yellow-800'
            }`}>
              {integrity.valid ? '✓ Database is healthy' : '⚠ Database issues detected'}
            </p>
            {integrity.recovered && (
              <p className="text-sm text-green-700 mt-1">
                Some issues were automatically recovered
              </p>
            )}
            {integrity.errors.length > 0 && (
              <div className="mt-2">
                <p className="text-sm font-medium">Errors:</p>
                <ul className="list-disc list-inside text-sm">
                  {integrity.errors.map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {recovery && (
          <div className="p-4 bg-blue-50 rounded border border-blue-200">
            <p className="font-medium text-blue-800">
              Recovery completed: {recovery.recovered} entries recovered
            </p>
            {recovery.errors.length > 0 && (
              <div className="mt-2">
                <p className="text-sm font-medium">Recovery errors:</p>
                <ul className="list-disc list-inside text-sm text-blue-700">
                  {recovery.errors.map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRecover} disabled={checking}>
            Recover Interrupted Writes
          </Button>
          <Button variant="primary" onClick={handleBackup}>
            Create Backup
          </Button>
          <label>
            <input
              type="file"
              accept=".json"
              onChange={handleRestore}
              className="hidden"
            />
            <Button variant="outline" as="span">
              Restore from Backup
            </Button>
          </label>
        </div>

        <div className="p-3 bg-gray-50 rounded text-sm text-gray-600">
          <p className="font-medium mb-1">About Data Persistence:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>All data is stored locally in IndexedDB</li>
            <li>Works completely offline - no internet required</li>
            <li>Automatic recovery from corrupted entries</li>
            <li>Transaction safety prevents data loss during writes</li>
            <li>Regular backups recommended for important research</li>
          </ul>
        </div>
      </div>
    </Card>
  );
};
