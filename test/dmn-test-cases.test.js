import { describe, expect, it } from 'vitest';
import { compareTestCase, createTestSuite, inspectDmnModel, validateTestSuite } from '../src/dmnTestCases.js';

const xml = `<definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/" namespace="https://example.org/credit" name="CreditAssessment"><inputData id="income" name="Income"><variable name="income"/></inputData><inputData id="age" name="Age"><variable name="age"/></inputData><decision id="eligibility" name="Eligibility"><variable name="eligibility"/></decision><decision id="risk" name="Risk"><variable name="risk"/></decision></definitions>`;
const suite = { formatVersion: 1, model: { namespace: 'https://example.org/credit', name: 'CreditAssessment' }, testCases: [{ name: 'approved-credit', inputs: { income: 5000, age: 35 }, expectedOutputs: { eligibility: 'approved', risk: null } }] };

describe('DMN test cases', () => {
  it('extracts input and decision criteria from the DMN model', () => {
    expect(inspectDmnModel(xml)).toMatchObject({ inputs: [{ id: 'income', name: 'income' }, { id: 'age', name: 'age' }], decisions: [{ id: 'eligibility', name: 'eligibility' }, { id: 'risk', name: 'risk' }] });
    expect(createTestSuite(xml)).toEqual({ formatVersion: 1, model: suite.model, testCases: [] });
  });

  it('accepts a structurally compatible suite', () => expect(validateTestSuite(suite, xml)).toEqual([]));

  it('reports every missing and additional input and decision separately', () => {
    const invalid = structuredClone(suite); invalid.testCases[0].inputs = { income: 5000, surplus: true }; invalid.testCases[0].expectedOutputs = { eligibility: 'approved', surplus: true };
    expect(validateTestSuite(invalid, xml).map(entry => entry.key)).toEqual(expect.arrayContaining(['dmnTests.error.missingInput', 'dmnTests.error.additionalInput', 'dmnTests.error.missingDecision', 'dmnTests.error.additionalDecision']));
  });

  it('keeps empty expected outputs executable without comparison', () => {
    expect(compareTestCase(suite.testCases[0], [{ id: 'eligibility', name: 'eligibility', value: 'approved' }, { id: 'risk', name: 'risk', value: 'low' }])).toEqual([{ decision: 'eligibility', expected: 'approved', actual: 'approved', status: 'fulfilled' }, { decision: 'risk', expected: null, actual: 'low', status: 'notChecked' }]);
  });
});
